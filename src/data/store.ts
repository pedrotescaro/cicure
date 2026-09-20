import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { QueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { readPreference, writePreference } from './preferences';
import { isDemoRecord } from './demo-cleanup';
import { acknowledge, markError, queue, readRecords, removeDemoRecords, writeRecord } from './storage';
import { supabase } from './supabase';
import type { Data, Entities, EntityKind } from '../domain/types';
import type { Organization, WorkMode } from '../features/organization/domain/types';
import { 
  DEFAULT_ORGS, 
  INDIVIDUAL_ORG, 
  createNewOrganization, 
  joinOrganizationByCode 
} from '../features/organization/domain/organization.service';

export const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30000, retry: 1, networkMode: 'always' } } });
export const uid = () => Crypto.randomUUID();
const empty = (): Data => ({ patients: [], wounds: [], visits: [], reports: [], profiles: [], products: [] });

export type ThemeMode = 'system' | 'light' | 'dark';

export type Store = { 
  data: Data; 
  scope: string; 
  ready: boolean; 
  presentation: boolean; 
  syncState: 'local' | 'syncing' | 'synced' | 'error'; 
  pending: number; 
  message: string | null; 
  error: string | null; 
  
  // Tema (Claro, Escuro, Sistema)
  preferencesReady: boolean;
  preferencesError: string | null;
  onboardingVisible: boolean;
  loadPreferences: () => void;
  markOnboardingSeen: () => void;
  finishOnboarding: () => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  // Modos de Trabalho (Autônomo Individual vs. Grupo/Clínica)
  workMode: WorkMode;
  activeOrg: Organization;
  organizations: Organization[];
  setWorkMode: (mode: WorkMode, orgId?: string) => Promise<void>;
  createGroup: (name: string, cnpj?: string, phone?: string) => Promise<Organization>;
  joinGroup: (inviteCode: string) => Promise<{ success: boolean; message: string; org?: Organization }>;

  init: (scope?: string) => Promise<void>; 
  save: <K extends EntityKind>(kind: K, entity: Entities[K]) => Promise<void>; 
  sync: () => Promise<void>; 
  toast: (message: string | null) => void; 
  setPresentation: (value: boolean) => void;
};

let syncing = false;

export const useStore = create<Store>((set, get) => ({
  data: empty(), 
  scope: 'individual', 
  ready: false, 
  presentation: false, 
  syncState: 'local', 
  pending: 0, 
  message: null, 
  error: null,
  
  workMode: 'individual',
  activeOrg: INDIVIDUAL_ORG,
  organizations: DEFAULT_ORGS,

  preferencesReady: false,
  preferencesError: null,
  onboardingVisible: false,
  themeMode: 'system',
  loadPreferences: () => {
    try {
      const mode = readPreference('cicure_theme_mode');
      const seen = readPreference('cicure_onboarding_seen');
      set({ themeMode: mode === 'light' || mode === 'dark' ? mode : 'system',
        onboardingVisible: seen !== 'true', preferencesReady: true, preferencesError: null });
    } catch {
      set({ preferencesError: 'Não foi possível carregar suas preferências. Tente novamente.' });
    }
  },
  markOnboardingSeen: () => {
    try {
      writePreference('cicure_onboarding_seen', 'true');
    } catch {
      Alert.alert('Preferência não salva', 'Não foi possível salvar a primeira abertura. Tente concluir o tutorial novamente.');
    }
  },
  finishOnboarding: () => {
    try {
      writePreference('cicure_onboarding_seen', 'true');
      set({ onboardingVisible: false });
    } catch {
      Alert.alert('Preferência não salva', 'Não foi possível salvar o tutorial. Tente novamente.');
    }
  },
  setThemeMode: (mode: ThemeMode) => {
    try {
      writePreference('cicure_theme_mode', mode);
      set({ themeMode: mode });
    } catch {
      Alert.alert('Tema não salvo', 'Não foi possível salvar sua preferência. Tente novamente.');
    }
  },

  toast: message => set({ message }), 
  setPresentation: presentation => set({ presentation }),

  setWorkMode: async (mode: WorkMode, orgId?: string) => {
    const { organizations } = get();
    let targetOrg: Organization;

    if (mode === 'individual') {
      targetOrg = organizations.find(o => o.isIndividual) || INDIVIDUAL_ORG;
    } else {
      targetOrg = (orgId ? organizations.find(o => o.id === orgId) : undefined) 
        || organizations.find(o => !o.isIndividual) 
        || DEFAULT_ORGS[1];
    }

    const nextOrgs = organizations.map(o => ({
      ...o,
      isCurrent: o.id === targetOrg.id
    }));

    const nextScope = mode === 'individual' ? 'individual' : `org_${targetOrg.id}`;
    set({ workMode: mode, activeOrg: targetOrg, organizations: nextOrgs });
    await get().init(nextScope);
  },

  createGroup: async (name: string, cnpj?: string, phone?: string) => {
    const newOrg = createNewOrganization(name, cnpj, phone);
    const nextOrgs = [...get().organizations.map(o => ({ ...o, isCurrent: false })), newOrg];
    set({ organizations: nextOrgs });
    await get().setWorkMode('group', newOrg.id);
    return newOrg;
  },

  joinGroup: async (inviteCode: string) => {
    const result = joinOrganizationByCode(inviteCode, get().organizations);
    if (result.error || !result.org) {
      return { success: false, message: result.error || 'Não foi possível entrar no grupo.' };
    }

    const nextOrgs = [...get().organizations.map(o => ({ ...o, isCurrent: false })), result.org];
    set({ organizations: nextOrgs });
    await get().setWorkMode('group', result.org.id);
    return { 
      success: true, 
      message: `Você ingressou na clínica "${result.org.name}" com sucesso!`,
      org: result.org 
    };
  },

  init: async (scope) => {
    const currentScope = scope ?? (get().workMode === 'individual' ? 'individual' : `org_${get().activeOrg.id}`);
    set({ ready: false, data: empty(), scope: currentScope, error: null, syncState: 'local' });
    try {
      await removeDemoRecords(currentScope);
      const rows = await readRecords(currentScope);

      const data = empty(); 
      rows.forEach(r => (data[r.kind] as unknown[]).push(r.payload));
      const pendingCount = (await queue(currentScope)).length;
      set({ data, ready: true, pending: pendingCount });

      // Dispara sincronização em segundo plano se houver conexão com o Supabase
      void get().sync();
    } catch { 
      set({ error: 'Não foi possível abrir o armazenamento SQLite local. Tente novamente.', ready: true }); 
    }
  },

  save: async (kind, entity) => {
    const { scope } = get();
    if (get().presentation) throw new Error('Saia do modo apresentação para editar.');
    
    // 1. Grava no banco local SQLite (Garantia de funcionamento 100% offline)
    await writeRecord(scope, kind, entity.id, entity, true);
    
    if (get().scope !== scope) return;
    set(state => ({ 
      data: { 
        ...state.data, 
        [kind]: [...state.data[kind].filter(r => r.id !== entity.id), entity] 
      }, 
      syncState: 'local' 
    }));
    
    const pendingCount = (await queue(scope)).length;
    set({ pending: pendingCount });
    await queryClient.invalidateQueries({ queryKey: ['records'] });

    // 2. Quando houver internet, tenta enviar imediatamente para o banco real (Supabase)
    void get().sync();
  },

  sync: async () => {
    if (syncing || !supabase) return;
    syncing = true; 
    const scope = get().scope; 
    set({ syncState: 'syncing', error: null });

    try {
      const queued = await queue(scope);
      if (queued.length > 0) {
        const order: EntityKind[] = ['profiles', 'patients', 'wounds', 'products', 'visits', 'reports'];
        queued.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));

        for (const item of queued) {
          try {
            let payload = item.payload;
            if (item.kind === 'visits') { 
              const { uploadVisitMedia } = await import('./media'); 
              payload = await uploadVisitMedia(scope, payload as Entities['visits']); 
            }

            // Tenta salvar via RPC oficial do Supabase
            const { error: rpcError } = await supabase.rpc('save_record', { 
              p_kind: item.kind, 
              p_id: item.entityId, 
              p_payload: payload, 
              p_version: item.version, 
              p_base_version: item.baseVersion 
            });

            // Se RPC falhar (ex.: RLS ou auth), tenta upsert direto na tabela do Supabase
            if (rpcError) {
              const { error: upsertError } = await supabase
                .from(item.kind)
                .upsert({
                  id: item.entityId,
                  payload: payload,
                  version: item.version,
                  updated_at: new Date().toISOString()
                });

              if (upsertError) {
                throw upsertError;
              }
            }

            // Confirmação: remove da fila do SQLite local
            await acknowledge(scope, item);
          } catch (itemErr: any) { 
            await markError(scope, item, itemErr instanceof Error ? itemErr.message : 'Falha no envio'); 
          }
        }
      }

      // Only report cloud success after the server confirms the read.
      const { data: remoteData, error: pullError } = await supabase.rpc('pull_records');
      if (pullError) throw pullError;
      if (Array.isArray(remoteData)) {
        for (const record of remoteData) {
          if (isDemoRecord(record.kind, record.id, record.payload)) continue;
          await writeRecord(scope, record.kind, record.id, record.payload, false, record.version);
        }
      }

      if (get().scope === scope) { 
        const updated = empty(); 
        (await readRecords(scope)).forEach(r => (updated[r.kind] as unknown[]).push(r.payload)); 
        const remainingPending = (await queue(scope)).length;
        set({ 
          data: updated, 
          pending: remainingPending, 
          syncState: remainingPending === 0 ? 'synced' : 'local' 
        }); 
      }
    } catch (error) { 
      if (get().scope === scope) {
        set({ 
          syncState: 'local', 
          error: error instanceof Error ? error.message : 'Modo Offline ativo. Seus registros estão salvos com segurança no aparelho.' 
        }); 
      }
    } finally { 
      syncing = false; 
    }
  },
}));
