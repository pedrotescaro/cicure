import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, RefreshCw } from 'lucide-react-native';
import { useStore } from '../../../data/store';
import { queue } from '../../../data/storage';
import { useNetworkStatus } from '../../../data/network';
import type { QueueItem } from '../../../domain/types';
import { Badge, Button, Card, Empty, IconButton, Pills, Txt, safeBack, s } from '../../../ui/components';
import { useTheme } from '../../../ui/theme';
import { conflictSummary, readConflict, resolveConflict } from '../domain/conflicts';

const names: Record<string, string> = { patients: 'Paciente', wounds: 'Ferida', visits: 'Atendimento', profiles: 'Perfil profissional', reports: 'Relatório', care_plans: 'Plano de cuidado', referrals: 'Encaminhamento', documents: 'Documento', inventory_items: 'Material', inventory_movements: 'Movimentação de estoque', clinical_templates: 'Modelo de atendimento', prescriptions: 'Prescrição', consents: 'Consentimento', products: 'Produto' };
export default function SyncCenterScreen() {
  const router = useRouter(); const store = useStore(); const { colors: c } = useTheme();
  const { isOnline } = useNetworkStatus();
  const [items, setItems] = useState<QueueItem[]>([]); const [filter, setFilter] = useState('Todos');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [conflict, setConflict] = useState<{ item: QueueItem; remote: { payload: unknown; version: number } } | null>(null);
  const refresh = async () => setItems(await queue(store.scope));
  useEffect(() => { let active = true; void queue(store.scope).then(rows => { if (active) setItems(rows); }); return () => { active = false; }; }, [store.scope, store.pending, store.syncState]);
  const run = async (action: () => Promise<void>) => { setBusy(true); setError(''); try { await action(); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível concluir. Tente novamente.'); } finally { setBusy(false); } };
  const sync = () => run(async () => { await store.sync(); const state = useStore.getState(); if (state.syncState !== 'synced') setError(state.error || 'Os registros continuam salvos neste aparelho. Confira as pendências abaixo.'); });
  const choose = (choice: 'local' | 'server') => { if (conflict) void run(async () => { await resolveConflict(conflict.item, conflict.remote, choice); setConflict(null); }); };
  const filtered = items.filter(item => filter === 'Todos' || (filter === 'Conflitos' ? /conflito|version conflict/i.test(item.error || '') : filter === 'Erros' ? Boolean(item.error) && !/conflito/i.test(item.error!) : !item.error));
  return <View style={{ flex: 1, backgroundColor: c.bg }}><ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 20 }}>
    <View style={[s.row, { flexWrap: 'wrap' }]}><IconButton icon={ChevronLeft} label="Voltar" onPress={() => safeBack(router, '/more')} /><Txt style={s.h1} accessibilityRole="header">Envio de dados</Txt></View>
    <Card style={{ gap: 12 }}><Badge tone={store.syncState === 'synced' ? 'green' : 'amber'}>{store.syncState === 'syncing' ? 'Enviando dados' : store.syncState === 'synced' ? 'Dados enviados' : isOnline ? 'Salvo neste aparelho' : 'Aguardando internet'}</Badge><Txt>{isOnline ? 'Com internet. Os dados só são marcados como enviados após a confirmação do servidor.' : 'Sem internet. Continue trabalhando; o envio será retomado quando a conexão voltar.'}</Txt><Txt>{store.pending} registro(s) aguardando envio</Txt><Button title="Tentar enviar novamente" icon={RefreshCw} loading={busy || store.syncState === 'syncing'} onPress={sync} /></Card>
    {!!error && <Txt accessibilityRole="alert" style={{ color: c.red }}>{error}</Txt>}
    <Pills options={['Todos', 'Pendentes', 'Conflitos', 'Erros']} value={filter} onChange={setFilter} />
    {!filtered.length && <Empty title="Nenhum item nesta lista" description={store.syncState === 'synced' ? 'O servidor confirmou o recebimento dos registros.' : 'Os registros salvos e as próximas tentativas aparecerão aqui.'} />}
    {filtered.map(item => <Card key={item.id} style={{ gap: 12 }}><Txt style={s.h2}>{names[item.kind] || 'Registro'}</Txt><Txt muted>Versão {item.version} · {item.attempts} tentativa(s)</Txt><Txt>{item.error ? /conflito|version conflict/i.test(item.error) ? 'Outra versão deste registro foi alterada em outro aparelho. As duas cópias serão preservadas no histórico.' : 'Não foi possível enviar este registro ou seus anexos. A cópia continua salva neste aparelho.' : 'Aguardando confirmação de envio.'}</Txt>{/conflito|version conflict/i.test(item.error || '') ? <Button title="Comparar versões" variant="outline" disabled={busy} onPress={() => run(async () => setConflict({ item, remote: await readConflict(item) }))} /> : item.error ? <Button title="Tentar enviar novamente" variant="outline" onPress={sync} loading={busy} /> : null}</Card>)}
    <Button title="Ver histórico de atividades" variant="outline" onPress={() => router.push('/security/audit')} />
  </ScrollView><Modal visible={Boolean(conflict)} onRequestClose={() => setConflict(null)} animationType="slide"><ScrollView contentContainerStyle={{ padding: 24, gap: 20, backgroundColor: c.bg }}><Txt style={s.h1}>Compare antes de escolher</Txt><Txt>As duas cópias ficam no histórico deste aparelho. Escolher sua cópia prepara um novo envio e ainda depende da confirmação do servidor.</Txt><Txt style={s.h2}>Neste aparelho</Txt><Txt selectable>{conflictSummary(conflict?.item.payload)}</Txt><Txt style={s.h2}>No servidor</Txt><Txt selectable>{conflictSummary(conflict?.remote.payload)}</Txt>{!!error && <Txt accessibilityRole="alert" style={{ color: c.red }}>{error}</Txt>}<Button title="Usar minha cópia e enviar" onPress={() => choose('local')} loading={busy} /><Button title="Usar a cópia do servidor" variant="outline" onPress={() => Alert.alert('Usar cópia do servidor', 'Sua versão permanece no histórico deste aparelho para consulta.', [{ text: 'Cancelar' }, { text: 'Usar cópia', onPress: () => choose('server') }])} loading={busy} /><Button title="Decidir depois" variant="ghost" onPress={() => setConflict(null)} disabled={busy} /></ScrollView></Modal></View>;
}
