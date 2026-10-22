import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { readLocalHistory } from '../../../data/storage';
import { useStore } from '../../../data/store';
import { supabase } from '../../../data/supabase';
import { Badge, Button, Card, IconButton, Pills, Txt, safeBack, s } from '../../../ui/components';
import { useTheme } from '../../../ui/theme';
import { conflictSummary } from '../../sync/domain/conflicts';
type LocalEvent = Awaited<ReturnType<typeof readLocalHistory>>[number];
type ServerEvent = { id: string; kind: string; record_id: string; action: string; created_at: string; version: number; user_id?: string };
export default function AuditLogScreen() {
  const router = useRouter(); const store = useStore(); const { colors: c } = useTheme();
  const [local, setLocal] = useState<LocalEvent[]>([]); const [server, setServer] = useState<ServerEvent[]>([]); const [filter, setFilter] = useState('Neste aparelho'); const [selected, setSelected] = useState<LocalEvent | null>(null); const [error, setError] = useState('');
  const load = async () => { setError(''); setLocal(await readLocalHistory(store.scope)); if (supabase) { const { data, error: cause } = await supabase.rpc('list_activity_events', { p_organization_id: store.scope.split(':org:')[1] || null }); if (cause) setError('Não foi possível consultar o histórico confirmado pelo servidor. As atividades deste aparelho continuam disponíveis.'); else setServer(data ?? []); } };
  useEffect(() => { void Promise.resolve().then(load); }, [store.scope]); // eslint-disable-line react-hooks/exhaustive-deps
  return <View style={{ flex: 1, backgroundColor: c.bg }}><ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 20 }}><View style={[s.row, { flexWrap: 'wrap' }]}><IconButton icon={ChevronLeft} label="Voltar" onPress={() => safeBack(router, '/more')} /><Txt style={s.h1}>Histórico de atividades</Txt></View><Txt>As atividades deste aparelho são registros locais. As confirmadas pelo servidor têm data e identidade registradas no serviço. As duas listas mostram até 300 atividades recentes.</Txt><Pills options={['Neste aparelho', 'No servidor', 'Cópias de conflitos']} value={filter} onChange={setFilter} />{!!error && <Txt accessibilityRole="alert" style={{ color: c.red }}>{error}</Txt>}<Button title="Atualizar histórico" variant="outline" onPress={() => void load()} />{store.presentation ? <Txt>Saia do modo apresentação para consultar os registros identificados.</Txt> : filter === 'No servidor' ? server.map(event => <Card key={event.id} style={{ gap: 8 }}><Badge tone="green">Confirmado pelo servidor</Badge><Txt>{event.action === 'INSERT' || event.action === 'create' ? 'Registro criado' : 'Registro atualizado'} · versão {event.version}</Txt><Txt muted>{new Date(event.created_at).toLocaleString('pt-BR')}</Txt><Txt selectable>Identificador: {event.record_id}</Txt></Card>) : local.filter(event => filter !== 'Cópias de conflitos' || event.event.startsWith('conflict')).map(event => <Card key={event.seq} style={{ gap: 8 }}><Badge>Neste aparelho</Badge><Txt>{event.event === 'conflict-local' ? 'Cópia do aparelho preservada' : event.event === 'conflict-server' ? 'Cópia do servidor preservada' : 'Registro salvo'} · versão {event.version}</Txt><Txt muted>{new Date(event.created_at).toLocaleString('pt-BR')}</Txt><Button title="Consultar conteúdo salvo" variant="ghost" onPress={() => setSelected(selected?.seq === event.seq ? null : event)} />{selected?.seq === event.seq && <Txt selectable>{conflictSummary(event.payload)}</Txt>}</Card>)}</ScrollView></View>;
}
