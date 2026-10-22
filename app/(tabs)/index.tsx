import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ChevronRight, ClipboardList, FileText, Plus, Search, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Avatar, Badge, Button, Card, Empty, IconButton, SectionTitle, Txt, s } from '../../src/ui/components';
import { fonts, useTheme } from '../../src/ui/theme';
import { useStore } from '../../src/data/store';
import { useTabContentInset } from '../../src/ui/navigation/useTabContentInset';
import { computePendingItems } from '../../src/features/pending/domain/pending.service';
import { GlobalSearchModal } from '../../src/features/search/ui/GlobalSearchModal';
import { WorkspaceBar } from '../../src/ui/WorkspaceBar';
import { buildAgendaEntries, localDay } from '../../src/features/agenda/domain/agenda.service';

export default function Home() {
  const router = useRouter();
  const { colors: c } = useTheme();
  const bottomInset = useTabContentInset();
  const store = useStore();
  const [searchVisible, setSearchVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pending = useMemo(() => computePendingItems(store.data, store.pending), [store.data, store.pending]);
  const today = buildAgendaEntries(store.data.visits).filter(entry => entry.date === localDay());
  const currentTime = format(new Date(), 'HH:mm');
  const next = today.find(entry => !entry.time || entry.time >= currentTime);
  const profile = store.data.profiles[0];
  const openVisit = (id: string) => router.push(`/care/new?visitId=${id}`);
  const refresh = async () => { setRefreshing(true); try { await store.init(); } finally { setRefreshing(false); } };
  return <View style={{ flex: 1, backgroundColor: c.bg }}>
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: bottomInset, gap: 22 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={c.red} />}>
      <View style={s.between}><Txt style={{ fontFamily: fonts.brand, fontSize: 26, color: c.red }}>cicure</Txt><IconButton icon={Search} label="Buscar em pacientes e atendimentos" onPress={() => setSearchVisible(true)} /></View>
      <WorkspaceBar />
      <View style={{ gap: 6 }}>
        <Txt accessibilityRole="header" style={s.h1}>Olá, {store.presentation ? 'profissional' : profile?.name.split(' ')[0] || 'profissional'}</Txt>
        <Txt muted>{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</Txt>
      </View>
      {!store.presentation && <Button title="Novo atendimento" icon={Plus} onPress={() => router.push('/care/new')} />}
      {!!store.error && <Card><Txt accessibilityLiveRegion="polite" style={{ color: c.red }}>{store.error}</Txt><Button title="Carregar registros novamente" variant="outline" onPress={() => void refresh()} loading={refreshing} /></Card>}
      <View style={{ gap: 12 }}>
        <SectionTitle title="Agenda de hoje" action="Ver agenda" onPress={() => router.push('/care')} />
        {today.length === 0 ? <Card><Empty icon={CalendarDays} title="Hoje está livre na agenda" description="Use a Agenda para escolher uma data e marcar o próximo atendimento." action="Abrir agenda" onPress={() => router.push('/care')} /></Card> : today.slice(0, 4).map(entry => {
          const visit = entry.visit;
          const patient = store.data.patients.find(item => item.id === visit.patientId);
          const wound = store.data.wounds.find(item => item.id === visit.woundId);
          const dark = entry.id === next?.id;
          return <Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={`Abrir ${entry.kind === 'return' ? 'retorno' : 'atendimento'} das ${entry.time || 'sem horário'}`} onPress={() => entry.kind === 'return' ? router.push(`/care/new?patientId=${visit.patientId}&woundId=${visit.woundId}`) : openVisit(visit.id)}>
            <Card dark={dark} style={{ gap: 12 }}>
              <View style={[s.between, { flexWrap: 'wrap' }]}><Txt style={{ color: dark ? '#FFF' : c.text, fontFamily: fonts.semibold, fontSize: 20 }}>{entry.time || 'Horário a definir'}</Txt><Badge dark={dark}>{dark ? 'Próximo atendimento' : entry.kind === 'return' ? 'Retorno' : 'Agendado'}</Badge></View>
              <View style={s.row}><Avatar name={patient?.name || 'Paciente'} color={patient?.color} anonymous={store.presentation} /><View style={{ flex: 1, gap: 5 }}><Txt style={{ color: dark ? '#FFF' : c.text, fontFamily: fonts.semibold }}>{store.presentation ? 'Paciente em apresentação' : patient?.name || 'Paciente não encontrado'}</Txt><Txt style={{ color: dark ? '#D2D2D2' : c.secondary }}>{store.presentation ? 'Dados clínicos ocultos' : wound?.location || 'Ferida não identificada'}</Txt></View><ChevronRight size={22} color={dark ? '#FFF' : c.secondary} /></View>
            </Card>
          </Pressable>;
        })}
        {today.length > 4 && <Button title={`Ver os ${today.length} atendimentos de hoje`} variant="outline" onPress={() => router.push('/care')} />}
      </View>
      <View style={{ gap: 12 }}>
        <SectionTitle title="O que precisa de atenção" action="Ver pendências" onPress={() => router.push('/pending')} />
        {pending.length ? pending.slice(0, 3).map(item => <Pressable key={item.id} accessibilityRole="button" onPress={() => router.push(item.route as never)}><Card style={{ gap: 8 }}><View style={s.between}><Txt style={{ flex: 1, fontFamily: fonts.semibold }}>{store.presentation ? 'Pendência de atendimento' : item.title}</Txt><ChevronRight size={22} color={c.secondary} /></View><Txt muted>{store.presentation ? 'Desative o modo apresentação para consultar o registro.' : item.description}</Txt></Card></Pressable>) : <Txt muted>Nenhuma pendência nos registros deste aparelho.</Txt>}
      </View>
      <View style={{ gap: 10 }}><SectionTitle title="Acessos rápidos" />
        {[{ label: 'Pacientes', detail: 'Buscar ou cadastrar um paciente', route: '/patients', Icon: Users }, { label: 'Agenda', detail: 'Marcar atendimentos e retornos', route: '/care', Icon: CalendarDays }, { label: 'Relatórios', detail: 'Gerar e consultar documentos', route: '/reports', Icon: FileText }, { label: 'Pendências', detail: 'Retomar o que ficou para depois', route: '/pending', Icon: ClipboardList }].map(({ label, detail, route, Icon }) => <Pressable key={route} accessibilityRole="button" onPress={() => router.push(route as never)} style={[s.row, { minHeight: 72, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }]}><Icon size={24} color={c.red} /><View style={{ flex: 1, gap: 4 }}><Txt style={{ fontFamily: fonts.semibold }}>{label}</Txt><Txt muted>{detail}</Txt></View><ChevronRight size={20} color={c.secondary} /></Pressable>)}
      </View>
    </ScrollView>
    <GlobalSearchModal visible={searchVisible} onClose={() => setSearchVisible(false)} />
  </View>;
}
