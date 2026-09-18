import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { QueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { acknowledge, markError, queue, readRecords, writeRecord } from './storage';
import { supabase } from './supabase';
import { demoData } from '../domain/demo';
import type { Data, Entities, EntityKind } from '../domain/types';
export const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30000, retry: 1, networkMode: 'always' } } });
export const uid = () => Crypto.randomUUID();
const empty = (): Data => ({ patients: [], wounds: [], visits: [], reports: [], profiles: [], products: [] });
type Store = { data: Data; scope: string; ready: boolean; presentation: boolean; syncState: 'local' | 'syncing' | 'synced' | 'error'; pending: number; message: string | null; error: string | null; init: (scope?: string) => Promise<void>; save: <K extends EntityKind>(kind: K, entity: Entities[K]) => Promise<void>; sync: () => Promise<void>; toast: (message: string | null) => void; setPresentation: (value: boolean) => void };
let syncing = false;
export const useStore = create<Store>((set, get) => ({
  data: empty(), scope: 'demo', ready: false, presentation: false, syncState: 'local', pending: 0, message: null, error: null,
  toast: message => set({ message }), setPresentation: presentation => set({ presentation }),
  init: async (scope = 'demo') => {
    set({ ready: false, data: empty(), scope, error: null, syncState: 'local' });
    try {
      let rows = await readRecords(scope);
      if (!rows.length && scope === 'demo') { const seed = demoData(); for (const kind of Object.keys(seed) as EntityKind[]) for (const record of seed[kind]) await writeRecord(scope, kind, record.id, record, false); rows = await readRecords(scope); }
      if (scope === 'demo' && rows.length) {
        const profile = rows.find(row => row.kind === 'profiles' && (row.payload as { name?: string }).name === 'Camila Ferreira');
        if (profile) await writeRecord(scope, 'profiles', (profile.payload as { id: string }).id, { ...profile.payload, name: 'Caroline Ferreira' }, false);
        for (const row of rows.filter(item => item.kind === 'visits')) {
          const visit = row.payload as { signedBy?: string };
          if (visit.signedBy?.includes('Camila')) await writeRecord(scope, 'visits', (row.payload as { id: string }).id, { ...row.payload, signedBy: visit.signedBy.replaceAll('Camila', 'Caroline') }, false);
        }
        rows = await readRecords(scope);
      }
      const data = empty(); rows.forEach(r => (data[r.kind] as unknown[]).push(r.payload));
      set({ data, ready: true, pending: (await queue(scope)).length });
      if (scope !== 'demo') void get().sync();
    } catch { set({ error: 'Não foi possível abrir o armazenamento local. Tente novamente.', ready: true }); }
  },
  save: async (kind, entity) => {
    const { scope } = get();
    if (get().presentation) throw new Error('Saia do modo apresentação para editar.');
    await writeRecord(scope, kind, entity.id, entity, scope !== 'demo');
    if (get().scope !== scope) return;
    set(state => ({ data: { ...state.data, [kind]: [...state.data[kind].filter(r => r.id !== entity.id), entity] }, syncState: 'local' }));
    set({ pending: (await queue(scope)).length });
    await queryClient.invalidateQueries({ queryKey: ['records'] });
  },
  sync: async () => {
    if (syncing || !supabase || get().scope === 'demo' || Platform.OS === 'web') return;
    syncing = true; const scope = get().scope; set({ syncState: 'syncing', error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id !== scope) throw new Error('Entre novamente para sincronizar esta conta.');
      const queued = await queue(scope);
      const order: EntityKind[] = ['profiles', 'patients', 'wounds', 'products', 'visits', 'reports'];
      queued.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
      for (const item of queued) {
        try {
          let payload = item.payload;
          if (item.kind === 'visits') { const { uploadVisitMedia } = await import('./media'); payload = await uploadVisitMedia(scope, payload as Entities['visits']); }
          const { error } = await supabase.rpc('save_record', { p_kind: item.kind, p_id: item.entityId, p_payload: payload, p_version: item.version, p_base_version: item.baseVersion });
          if (error) throw error;
          await acknowledge(scope, item);
        } catch (error) { await markError(scope, item, error instanceof Error ? error.message : 'Falha no envio'); throw error; }
      }
      const { data, error } = await supabase.rpc('pull_records');
      if (error) throw error;
      for (const record of data ?? []) await writeRecord(scope, record.kind, record.id, record.payload, false, record.version);
      if (get().scope === scope) { const updated = empty(); (await readRecords(scope)).forEach(r => (updated[r.kind] as unknown[]).push(r.payload)); set({ data: updated, pending: (await queue(scope)).length, syncState: 'synced' }); }
    } catch (error) { if (get().scope === scope) set({ syncState: 'error', error: error instanceof Error ? error.message : 'Sem conexão. Seus registros continuam salvos neste aparelho.' }); }
    finally { syncing = false; }
  },
}));
