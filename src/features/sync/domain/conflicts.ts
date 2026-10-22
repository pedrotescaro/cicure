import { createAccountClient } from '../../../data/supabase';
import { queue, resolveQueuedRecord } from '../../../data/storage';
import { useStore } from '../../../data/store';
import type { QueueItem } from '../../../domain/types';
export async function readConflict(item: QueueItem) {
  const scope = useStore.getState().scope;
  const client = await createAccountClient(scope);
  const { data: remote, error } = await client.from('app_records').select('kind,id,payload,version').eq('id', item.entityId).eq('kind', item.kind).maybeSingle();
  if (error) throw new Error('Não foi possível consultar a outra versão. Verifique a internet e tente novamente.');
  if (scope !== useStore.getState().scope) throw new Error('A conta mudou. Abra os registros novamente.');
  if (!remote) throw new Error('O registro do servidor não está disponível para esta conta. A cópia local foi preservada.');
  if ((remote.payload?.organizationId || null) !== (scope.split(':org:')[1] || null)) throw new Error('Este registro não pertence à clínica aberta. A cópia local foi preservada.');
  return { payload: remote.payload, version: Number(remote.version) };
}
export async function resolveConflict(item: QueueItem, remote: { payload: unknown; version: number }, choice: 'local' | 'server') {
  const store = useStore.getState();
  if (!store.authUserId || store.presentation) throw new Error('Entre na conta e saia do modo apresentação para resolver.');
  const fresh = await readConflict(item);
  if (fresh.version !== remote.version) throw new Error('O servidor recebeu outra alteração. Compare novamente antes de decidir.');
  const current = (await queue(store.scope)).find(row => row.id === item.id);
  if (!current || current.version !== item.version) throw new Error('Sua cópia local mudou. Compare novamente.');
  if (choice === 'local' && item.kind === 'visits' && (remote.payload as { state?: string }).state === 'Concluído') throw new Error('Um atendimento concluído não pode ser substituído. Use a versão do servidor e registre a correção em um adendo. Sua cópia fica no histórico deste aparelho.');
  await resolveQueuedRecord(store.scope, item, remote, choice);
  await store.init(store.scope);
  await store.sync();
}

const labels: Record<string, string> = { name: 'Nome', plan: 'Plano de cuidado', guidance: 'Orientações', length: 'Comprimento (cm)', width: 'Largura (cm)', depth: 'Profundidade (cm)', state: 'Situação', location: 'Localização', subjective: 'Relato do paciente', objective: 'Exame e medidas', assessment: 'Avaliação profissional', returnDate: 'Retorno', description: 'Descrição', observations: 'Observações', updatedAt: 'Última alteração', date: 'Data' };
export function conflictSummary(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return 'Registro sem conteúdo legível.';
  return Object.entries(payload).filter(([key, value]) => key in labels && typeof value !== 'object' && value !== '').map(([key, value]) => `${labels[key]}: ${String(value)}`).concat('soap' in payload ? conflictSummary((payload as { soap: unknown }).soap) : []).join('\n') || 'Compare o registro completo no histórico de atividades.';
}
