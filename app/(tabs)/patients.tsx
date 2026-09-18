import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { addDays, format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Search, SlidersHorizontal, TrendingDown, TrendingUp, UserRoundPlus, Minus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Avatar, Badge, Card, Empty, IconButton, Pills, SectionTitle, Txt, s } from '../../src/ui/components';
import { colors as c, fonts } from '../../src/ui/theme';
import { useStore } from '../../src/data/store';
import { dateLabel } from '../../src/domain/clinical';

const filters = ['Todos', 'Ativos', 'Alta', 'Arquivados'];
const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function MonthStrip() {
  const [selected, setSelected] = useState(new Date());
  const start = addDays(selected, -3);
  return <View style={{ gap: 14 }}>
    <View style={styles.monthHeader}><IconButton icon={ArrowLeft} label="Mês anterior" onPress={() => setSelected(addDays(selected, -7))} /><Txt style={{ fontFamily: fonts.semibold, fontSize: 17 }}>{format(selected, "MMMM / yyyy", { locale: ptBR }).replace(/^./, letter => letter.toUpperCase())}</Txt><IconButton icon={ArrowRight} label="Próximo mês" onPress={() => setSelected(addDays(selected, 7))} /></View>
    <View style={styles.calendarRow}>{Array.from({ length: 7 }).map((_, index) => { const date = addDays(start, index); const active = format(date, 'yyyy-MM-dd') === format(selected, 'yyyy-MM-dd'); return <Pressable key={index} onPress={() => setSelected(date)} style={styles.calendarDay}><Txt muted style={{ fontSize: 11, fontFamily: fonts.medium }}>{weekdays[index]}</Txt><View style={[styles.dateCircle, active && { backgroundColor: c.dark, borderColor: c.dark }]}><Txt style={{ color: active ? '#FFF' : c.text, fontFamily: fonts.medium }}>{format(date, 'd')}</Txt></View>{isToday(date) && <View style={styles.todayDot} />}</Pressable>; })}</View>
  </View>;
}

export default function Patients() {
  const router = useRouter();
  const { patients, wounds, visits } = useStore(st => st.data);
  const presentation = useStore(st => st.presentation);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Todos');
  const filtered = useMemo(() => {
    const todayIds = new Set(visits.filter(v => v.state === 'Agendado' && v.date.slice(0, 10) === new Date().toISOString().slice(0, 10)).map(v => v.patientId));
    return patients.filter(p => (filter === 'Todos' || p.status === filter) && p.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => Number(todayIds.has(b.id)) - Number(todayIds.has(a.id)));
  }, [patients, query, filter, visits]);
  const todayIds = new Set(visits.filter(v => v.state === 'Agendado' && v.date.slice(0, 10) === new Date().toISOString().slice(0, 10)).map(v => v.patientId));
  return <View style={{ flex: 1, backgroundColor: c.bg }}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.topbar}><Txt style={styles.brand}>cicura</Txt><View style={s.row}><IconButton icon={SlidersHorizontal} label="Filtros" onPress={() => {}} /><IconButton icon={UserRoundPlus} label="Adicionar paciente" color={c.red} onPress={() => {}} /></View></View>
    <Txt style={s.h1}>Pacientes</Txt>
    <MonthStrip />
    <Pills options={filters} value={filter} onChange={setFilter} />
    <View style={styles.search}><Search size={18} color={c.tertiary} /><TextInput accessibilityLabel="Buscar paciente" value={query} onChangeText={setQuery} placeholder="Buscar paciente" placeholderTextColor="#818181" style={styles.searchInput} /><SlidersHorizontal size={17} color={c.tertiary} /></View>
    <View style={{ gap: 10 }}><Txt muted style={styles.sectionLabel}>HOJE</Txt><View style={s.row}><Txt style={{ fontFamily: fonts.semibold, fontSize: 19 }}>{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR }).replace(/^./, letter => letter.toUpperCase())}</Txt><ChevronDown size={19} color={c.secondary} /></View></View>
    <View style={{ gap: 12 }}><SectionTitle title={`${filtered.length} PACIENTES`} action="Ordenar" />{filtered.map(patient => { const wound = wounds.find(w => w.patientId === patient.id); const today = todayIds.has(patient.id); const latest = visits.filter(v => v.patientId === patient.id && v.state === 'Concluído').sort((a, b) => b.date.localeCompare(a.date))[0]; const trend = wound?.status === 'Piora' ? 'up' : wound?.status === 'Estagnada' ? 'flat' : 'down'; return <Pressable key={patient.id} accessibilityRole="button" onPress={() => router.push(`/patient/${patient.id}`)}><Card dark={today} style={[styles.patientCard, today && { borderColor: c.dark }]}><View style={s.between}><View style={s.row}><View style={{ width: 4, height: 55, borderRadius: 4, backgroundColor: today ? '#FFF' : c.red, opacity: today ? .7 : .85 }} /><Avatar name={patient.name} color={patient.color} anonymous={presentation} /><View style={{ gap: 4, flex: 1 }}><Txt style={{ color: today ? '#FFF' : c.text, fontFamily: fonts.semibold, fontSize: 16 }}>{presentation ? 'Paciente em apresentação' : patient.name}</Txt><Txt style={{ color: today ? '#BDBDBD' : c.secondary, fontSize: 12 }}>{presentation ? 'Identificação oculta' : `${patient.sex} · ${new Date().getFullYear() - Number(patient.birthDate.slice(0, 4))} anos`}</Txt></View></View><ChevronRight size={20} color={today ? '#AAA' : c.tertiary} /></View><Txt style={{ color: today ? '#D2D2D2' : c.secondary, fontSize: 13, lineHeight: 19 }}>{presentation ? 'Dados clínicos ocultos no modo apresentação.' : `${wound?.location ?? 'Sem ferida'} · acompanhamento longitudinal`}</Txt><View style={styles.cardBottom}><Badge dark={today} tone={wound?.etiology === 'Pé diabético' ? 'red' : 'neutral'}>{presentation ? 'Ferida em acompanhamento' : wound?.etiology ?? 'Sem ferida'}</Badge><Txt style={{ color: today ? '#C3C3C3' : c.tertiary, fontSize: 11, flex: 1 }}>{latest ? `Último atendimento · ${dateLabel(latest.date)}` : 'Sem atendimento registrado'}</Txt><View style={[styles.trend, today && { backgroundColor: '#303030' }]}>{trend === 'down' ? <TrendingDown size={17} color={c.green} /> : trend === 'up' ? <TrendingUp size={17} color={c.red} /> : <Minus size={17} color={c.amber} />}</View></View></Card></Pressable>; })}{filtered.length === 0 && <Card><Empty title="Nenhum paciente encontrado" description="Ajuste a busca ou escolha outro filtro para continuar." action="Limpar filtros" onPress={() => { setQuery(''); setFilter('Todos'); }} /></Card>}</View>
  </ScrollView></View>;
}

const styles = StyleSheet.create({ content: { padding: 24, paddingTop: 22, paddingBottom: 170, gap: 22 }, topbar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, brand: { color: c.red, fontFamily: fonts.brand, fontSize: 26, letterSpacing: -.9 }, monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 }, calendarRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 }, calendarDay: { alignItems: 'center', minWidth: 37, gap: 7 }, dateCircle: { width: 42, height: 42, borderRadius: 22, borderWidth: 1, borderColor: '#DDE0E3', alignItems: 'center', justifyContent: 'center' }, todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.red }, search: { height: 49, borderRadius: 15, backgroundColor: '#FFF', borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 9 }, searchInput: { flex: 1, minHeight: 48, color: c.text, fontFamily: fonts.regular, fontSize: 15 }, sectionLabel: { fontSize: 11, letterSpacing: 1.5, fontFamily: fonts.semibold }, patientCard: { padding: 20, gap: 15 }, cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 9 }, trend: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F8F4' } });
