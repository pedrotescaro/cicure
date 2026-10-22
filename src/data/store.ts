import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { QueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { readPreference, writePreference } from './preferences';
import { isDemoRecord } from './demo-cleanup';
import { acknowledge, markError, queue, readRecords, removeDemoRecords, writeRecord } from './storage';
import { supabase, createAccountClient } from './supabase';
import type { Data, Entities, EntityKind } from '../domain/types';
import type { Organization, WorkMode } from '../features/organization/domain/types';
import { DEFAULT_ORGS, INDIVIDUAL_ORG } from '../features/organization/domain/organization.service';

export const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30000, retry: 1, networkMode: 'always' } } });
export const uid = () => Crypto.randomUUID();
const empty = (): Data => ({ patients: [], wounds: [], visits: [], reports: [], profiles: [], products: [], care_plans: [], referrals: [], documents: [], inventory_items: [], inventory_movements: [], clinical_templates: [], consents: [], prescriptions: [] });

export type ThemeMode = 'system' | 'light' | 'dark';

export type Store = {
  data: Data;
  scope: string;
  authUserId: string | null;
  setAuthUser: (userId: string) => void;
  clearAuthUser: () => void;
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
const savingRecords = new Map<string, Promise<void>>();
async function scopedQueue(scope: string, userId: string) {
  const items = await queue(scope);
  if (scope !== `user:${userId}`) items.push(...(await queue(`user:${userId}`)).filter(item => item.kind === 'profiles'));
  return items;
}

export const useStore = create<Store>((set, get) => ({
  data: empty(),
  scope: '',
  authUserId: null,
  setAuthUser: userId => { queryClient.clear(); set({ authUserId: userId, ready: false, presentation: false, workMode: 'individual', activeOrg: INDIVIDUAL_ORG, organizations: DEFAULT_ORGS, data: empty(), scope: `user:${userId}`, syncState: 'local', pending: 0, error: null }); },
  clearAuthUser: () => { queryClient.clear(); set({ authUserId: null, ready: false, presentation: false, workMode: 'individual', activeOrg: INDIVIDUAL_ORG, organizations: DEFAULT_ORGS, data: empty(), scope: '', syncState: 'local', pending: 0, error: null }); },
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
    const userId = get().authUserId;
    if (!userId) throw new Error('Entre na sua conta para escolher a clínica.');
    let targetOrg = INDIVIDUAL_ORG;
    if (mode === 'group') {
      if (!orgId) throw new Error('Escolha uma clínica.');
      const { verifyOrganizationAccess } = await import('../features/organization/domain/organization.service');
      const access = await verifyOrganizationAccess(orgId);
      if (get().authUserId !== userId) throw new Error('Sua conta mudou. Entre novamente.');
      targetOrg = access.organization;
    }
    const nextScope = `user:${userId}${mode === 'group' ? `:org:${targetOrg.id}` : ''}`;
    queryClient.clear();
    set({ workMode: mode, activeOrg: targetOrg, organizations: [...get().organizations.filter(org => org.id !== targetOrg.id), targetOrg].map(org => ({ ...org, isCurrent: org.id === targetOrg.id })), data: empty(), ready: false, scope: nextScope });
    await get().init(nextScope);
  },

  createGroup: async (name: string, cnpj?: string, phone?: string) => {
    const { createOrganization } = await import('../features/organization/domain/organization.service');
    const org = await createOrganization(name, cnpj, phone);
    await get().setWorkMode('group', org.id);
    return org;
  },

  joinGroup: async (inviteCode: string) => {
    const { acceptOrganizationInvitation } = await import('../features/organization/domain/organization.service');
    const org = await acceptOrganizationInvitation(inviteCode);
    await get().setWorkMode('group', org.id);
    return { success: true, message: 'Seu acesso à clínica foi confirmado.', org };
  },

  init: async (scope) => {
    const userId = get().authUserId;
    const currentScope = scope ?? get().scope;
    const individualScope = `user:${userId}`;
    if (!userId || (currentScope !== individualScope && !currentScope.startsWith(`${individualScope}:org:`))) throw new Error('Entre na sua conta para abrir os registros.');
    set({ ready: false, data: empty(), scope: currentScope, error: null, syncState: 'local' });
    try {
      if (currentScope !== individualScope) {
        const { verifyOrganizationAccess } = await import('../features/organization/domain/organization.service');
        await verifyOrganizationAccess(currentScope.slice(`${individualScope}:org:`.length));
      }
      await removeDemoRecords(currentScope);
      const rows = await readRecords(currentScope);

      const data = empty();
      rows.forEach(r => { if (r.kind in data) (data[r.kind] as unknown[]).push(r.payload); });
      if (currentScope !== individualScope) data.profiles = (await readRecords(individualScope)).filter(row => row.kind === 'profiles').map(row => row.payload as Entities['profiles']);
      const pendingCount = (await scopedQueue(currentScope, userId)).length;
      if (get().authUserId !== userId || get().scope !== currentScope) return;
      set({ data, ready: true, pending: pendingCount });

      // Dispara sincronização em segundo plano se houver conexão com o Supabase
      void get().sync();
    } catch {
      if (get().authUserId === userId && get().scope === currentScope) set({ data: empty(), error: currentScope !== individualScope ? 'Não foi possível confirmar seu acesso à clínica. Conecte-se à internet e volte ao Menu para escolher a clínica novamente.' : 'Não foi possível abrir os registros deste aparelho. Tente novamente.', ready: true });
    }
  },

  save: async (kind, entity) => {
    const requestedScope = get().scope;
    const requestedUser = get().authUserId;
    const saveKey = `${requestedScope}:${kind}:${entity.id}`;
    const operation = (savingRecords.get(saveKey) ?? Promise.resolve()).catch(() => undefined).then(async () => {
    if (get().scope !== requestedScope || get().authUserId !== requestedUser) throw new Error('A conta ou clínica mudou. Abra o registro novamente antes de salvar.');
    const { scope, authUserId } = get();
    if (!authUserId || (scope !== `user:${authUserId}` && !scope.startsWith(`user:${authUserId}:org:`))) throw new Error('Entre na sua conta para salvar registros.');
    if (get().presentation) throw new Error('Saia do modo apresentação para editar.');
    const priorEntity = get().data[kind].find(row => row.id === entity.id);
    if (!priorEntity && 'createdBy' in entity && entity.createdBy && entity.createdBy !== authUserId) throw new Error('A autoria deste registro não corresponde à conta aberta. Abra a tela novamente.');
    const linkedPatient = 'patientId' in entity ? entity.patientId : undefined;
    const linkedWound = 'woundId' in entity ? entity.woundId : undefined;
    if (linkedPatient && !get().data.patients.some(patient => patient.id === linkedPatient && !patient.deletedAt)) throw new Error('Este paciente não está disponível na conta ou clínica aberta. Volte à lista de pacientes.');
    if (linkedWound && !get().data.wounds.some(wound => wound.id === linkedWound && !wound.deletedAt && (!linkedPatient || wound.patientId === linkedPatient))) throw new Error('A ferida selecionada não pertence ao prontuário aberto. Selecione a ferida novamente.');
    if (get().workMode === 'group' && kind !== 'profiles') {
      const { verifyOrganizationAccess, canWriteOrganizationRecord } = await import('../features/organization/domain/organization.service');
      const access = await verifyOrganizationAccess(get().activeOrg.id);
      if (!canWriteOrganizationRecord(access.role, kind, entity as unknown as Record<string, unknown>)) throw new Error('Seu papel na clínica permite consultar este registro, mas não alterá-lo. Procure um administrador.');
      if (get().scope !== scope) throw new Error('A clínica mudou. Abra o registro novamente.');
      entity = { ...entity, organizationId: get().activeOrg.id };
    }
    if (kind === 'profiles' && entity.id !== authUserId) throw new Error('Você só pode alterar seu próprio perfil.');
    if (kind === 'visits') {
      const { assertVisitMutation } = await import('../domain/visit.lifecycle');
      const previous = get().data.visits.find(row => row.id === entity.id);
      if (previous) assertVisitMutation(previous, entity as Entities['visits']);
    }
    if (kind === 'inventory_movements') {
      const previous = get().data[kind].find(row => row.id === entity.id);
      if (previous && JSON.stringify(previous) !== JSON.stringify(entity)) throw new Error('Este registro faz parte do histórico e não pode ser alterado.');
    }

    // 1. Grava no banco local SQLite (Garantia de funcionamento 100% offline)
    const recordScope = kind === 'profiles' ? `user:${authUserId}` : scope;
    await writeRecord(recordScope, kind, entity.id, entity, true);
    if (kind === 'visits') {
      // Clinical data is durable before asking Android for notification permissions.
      const { updateAppointmentReminder } = await import('../features/agenda/domain/reminders');
      const updated = await updateAppointmentReminder(scope, entity as Entities['visits']);
      if (get().scope === scope) {
        entity = updated as Entities[typeof kind];
        await writeRecord(scope, kind, entity.id, entity, true);
      }
    }

    if (get().scope !== scope) return;
    set(state => ({
      data: {
        ...state.data,
        [kind]: [...state.data[kind].filter(r => r.id !== entity.id), entity]
      },
      syncState: 'local'
    }));

    const pendingCount = (await scopedQueue(scope, authUserId)).length;
    if (get().scope !== scope) return;
    set({ pending: pendingCount });
    await queryClient.invalidateQueries({ queryKey: ['records'] });

    // 2. Quando houver internet, tenta enviar imediatamente para o banco real (Supabase)
    void get().sync();
    });
    savingRecords.set(saveKey, operation);
    try { await operation; }
    finally { if (savingRecords.get(saveKey) === operation) savingRecords.delete(saveKey); }
  },

  sync: async () => {
    const userId = get().authUserId;
    if (syncing || !supabase || !userId || !get().scope.startsWith(`user:${userId}`)) return;
    syncing = true;
    const scope = get().scope;
    set({ syncState: 'syncing', error: null });

    try {
      const client = await createAccountClient(scope);
      if (get().authUserId !== userId || get().scope !== scope) return;
      const organizationId = scope.split(':org:')[1];
      if (organizationId) {
        const { verifyOrganizationAccess } = await import('../features/organization/domain/organization.service');
        await verifyOrganizationAccess(organizationId);
      }
      const queued = await scopedQueue(scope, userId);
      if (get().authUserId !== userId || get().scope !== scope) return;
      if (queued.length > 0) {
        const order: EntityKind[] = ['profiles', 'patients', 'wounds', 'products', 'inventory_items', 'visits', 'care_plans', 'prescriptions', 'consents', 'clinical_templates', 'inventory_movements', 'referrals', 'documents', 'reports'];
        queued.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));

        for (const item of queued) {
          if (get().authUserId !== userId || get().scope !== scope) return;
          const itemScope = item.kind === 'profiles' ? `user:${userId}` : scope;
          try {
            let payload = item.payload;
            if (item.kind === 'visits') {
              const { uploadVisitMedia } = await import('./media');
              payload = await uploadVisitMedia(scope, payload as Entities['visits'], client);
            }
            if (get().authUserId !== userId || get().scope !== scope) return;

            // Tenta salvar via RPC oficial do Supabase
            const { data: saved, error: rpcError } = await client.rpc('save_record', {
              p_kind: item.kind,
              p_id: item.entityId,
              p_payload: payload,
              p_version: item.version,
              p_base_version: item.baseVersion
            });

            if (rpcError) throw rpcError;
            if (saved?.id !== item.entityId || Number(saved?.version) !== item.version) throw new Error('O servidor não confirmou esta versão.');

            // Confirmação: remove da fila do SQLite local
            await acknowledge(itemScope, item);
          } catch (itemErr: any) {
            const reason = itemErr && typeof itemErr === 'object' && 'message' in itemErr ? String(itemErr.message) : 'Falha no envio';
            await markError(itemScope, item, /version conflict|40001/i.test(reason) ? 'Conflito: existe outra versão no servidor. Compare os registros antes de enviar novamente.' : reason);
          }
        }
      }

      // Only report cloud success after the server confirms the read.
      if (get().authUserId !== userId || get().scope !== scope) return;
      const remoteData: { kind: EntityKind; id: string; payload: any; version: number }[] = [];
      let afterId: string | null = null;
      for (;;) {
        const response: { data: { kind: EntityKind; id: string; payload: unknown; version: number }[] | null; error: unknown } = await client.rpc('pull_records', { p_organization_id: organizationId || null, p_after_id: afterId, p_limit: 200 });
        const page: { kind: EntityKind; id: string; payload: unknown; version: number }[] | null = response.data;
        const pullError = response.error;
        if (pullError) throw pullError;
        if (!Array.isArray(page)) throw new Error('O servidor não confirmou a leitura dos registros.');
        remoteData.push(...page);
        if (page.length < 200) break;
        const next: string | undefined = page[page.length - 1]?.id;
        if (!next || next === afterId) throw new Error('O servidor não avançou a consulta de registros.');
        afterId = next;
        if (get().authUserId !== userId || get().scope !== scope) return;
      }
      if (get().authUserId !== userId || get().scope !== scope) return;
      let mediaFailures = 0;
      if (Array.isArray(remoteData)) {
        for (const record of remoteData) {
          if (get().authUserId !== userId || get().scope !== scope) return;
          if (isDemoRecord(record.kind, record.id, record.payload)) continue;
          if (!(record.kind in empty())) continue;
          let payload = record.payload;
          if (record.kind === 'visits') {
            const { hydrateVisitMedia } = await import('./media');
            const result = await hydrateVisitMedia(scope, payload as Entities['visits'], client);
            payload = result.visit;
            mediaFailures += result.failed;
          }
          if (get().authUserId !== userId || get().scope !== scope) return;
          await writeRecord(record.kind === 'profiles' ? `user:${userId}` : scope, record.kind, record.id, payload, false, record.version);
        }
      }

      if (get().scope === scope && get().authUserId === userId) {
        const updated = empty();
        (await readRecords(scope)).forEach(r => { if (r.kind in updated) (updated[r.kind] as unknown[]).push(r.payload); });
        if (organizationId) updated.profiles = (await readRecords(`user:${userId}`)).filter(row => row.kind === 'profiles').map(row => row.payload as Entities['profiles']);
        const remainingPending = (await scopedQueue(scope, userId)).length;
        set({
          data: updated,
          pending: remainingPending,
          syncState: remainingPending === 0 && mediaFailures === 0 ? 'synced' : 'local',
          error: mediaFailures > 0 ? `${mediaFailures} imagem(ns) não puderam ser carregadas. Toque para sincronizar novamente.` : null,
        });
      }
    } catch {
      if (get().scope === scope && get().authUserId === userId) {
        set({
          syncState: 'local',
          error: scope.includes(':org:') ? 'Não foi possível confirmar o acesso à clínica ou enviar seus registros. Conecte-se à internet e tente novamente.' : 'Não foi possível enviar os dados. Seus registros continuam salvos neste aparelho. Confira sua conexão e tente novamente.'
        });
      }
    } finally {
      syncing = false;
      if (get().authUserId && (get().authUserId !== userId || get().scope !== scope)) void get().sync();
    }
  },
}));
