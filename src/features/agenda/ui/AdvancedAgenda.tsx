import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { addDays, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react-native';
import { Avatar, Badge, Button, Card, Empty, Field, IconButton, Pills, SectionTitle, Txt, s } from '../../../ui/components';
import { DateField } from '../../../ui/DateField';
import { fonts, useTheme } from '../../../ui/theme';
import { useMotionPreferences } from '../../../ui/useMotionPreferences';
import { useTabContentInset } from '../../../ui/navigation/useTabContentInset';
import { uid, useStore } from '../../../data/store';
import { dateLabel } from '../../../domain/clinical';
import { newVisit } from '../../../domain/visit';
import { validCalendarDate } from '../../../domain/visit.lifecycle';
import type { Visit } from '../../../domain/types';
import { buildAgendaEntries, localDay, reminderLabel, validTime } from '../domain/agenda.service';

export default function AdvancedAgenda() {
  const bottomInset = useTabContentInset();
  const router = useRouter();
  const { visits, patients, wounds } = useStore(state => state.data);
  const presentation = useStore(state => state.presentation);
  const save = useStore(state => state.save);
  const { colors: c } = useTheme();
  const [selectedDate, setSelectedDate] = useState(localDay());
  const [period, setPeriod] = useState('Dia');
  const [filter, setFilter] = useState('Todos');
  const [form, setForm] = useState<Visit | 'new' | null>(null);
  const [failure, setFailure] = useState('');
  const [busyId, setBusyId] = useState('');
  const today = localDay();
  const entries = useMemo(() => buildAgendaEntries(visits), [visits]);
  const selected = validCalendarDate(selectedDate) ? new Date(`${selectedDate}T12:00:00`) : new Date();
  const from = period === 'Semana' ? localDay(startOfWeek(selected, { weekStartsOn: 1 })) : period === 'Mês' ? localDay(startOfMonth(selected)) : selectedDate;
  const to = period === 'Semana' ? localDay(endOfWeek(selected, { weekStartsOn: 1 })) : period === 'Mês' ? localDay(endOfMonth(selected)) : selectedDate;
  const filtered = entries.filter(entry => (period === 'Todas as datas' || (entry.date >= from && entry.date <= to)) && (filter !== 'Retornos' || entry.kind === 'return') && (filter !== 'Agendados' || entry.kind === 'appointment') && (filter !== 'Atrasados' || entry.date < today));
  const cancel = (visit: Visit) => Alert.alert('Cancelar agendamento?', 'O horário será retirado da agenda e o lembrete será cancelado. O prontuário do paciente será mantido.', [{ text: 'Manter', style: 'cancel' }, { text: 'Cancelar agendamento', style: 'destructive', onPress: () => { setBusyId(visit.id); void save('visits', { ...visit, deletedAt: new Date().toISOString() }).catch(() => setFailure('Não foi possível cancelar. Tente novamente.')).finally(() => setBusyId('')); } }]);
  const moveDate = (direction: number) => setSelectedDate(localDay(addDays(selected, direction * (period === 'Semana' ? 7 : period === 'Mês' ? 30 : 1))));
  return <View style={{ flex: 1, backgroundColor: c.bg }}>
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: bottomInset, gap: 20 }} keyboardShouldPersistTaps="handled">
      <Txt style={{ fontFamily: fonts.brand, fontSize: 26, color: c.red }}>cicure</Txt>
      <Txt accessibilityRole="header" style={s.h1}>Agenda</Txt>
      <Txt muted>Atendimentos marcados e retornos registrados ao concluir uma consulta.</Txt>
      {!presentation && <Button title="Agendar atendimento" icon={Plus} onPress={() => setForm('new')} />}
      <Pills options={['Dia', 'Semana', 'Mês', 'Todas as datas']} value={period} onChange={setPeriod} />
      {period !== 'Todas as datas' && <><View style={s.between}><IconButton icon={ChevronLeft} label="Período anterior" onPress={() => moveDate(-1)} /><Button title="Hoje" variant="outline" onPress={() => setSelectedDate(today)} /><IconButton icon={ChevronRight} label="Próximo período" onPress={() => moveDate(1)} /></View><DateField label="Data da agenda" value={selectedDate} onChange={setSelectedDate} /></>}
      <Pills options={['Todos', 'Agendados', 'Retornos', 'Atrasados']} value={filter} onChange={setFilter} />
      {!!failure && <Txt style={{ color: c.red }} accessibilityLiveRegion="polite">{failure}</Txt>}
      <SectionTitle title={`${filtered.length} ${filtered.length === 1 ? 'compromisso' : 'compromissos'}`} />
      {filtered.map(entry => {
        const patient = patients.find(item => item.id === entry.visit.patientId);
        const wound = wounds.find(item => item.id === entry.visit.woundId);
        return <Card key={entry.id}>
          <View style={[s.between, { flexWrap: 'wrap' }]}><Txt style={s.h2}>{dateLabel(entry.date)} · {entry.time || 'Sem horário'}</Txt><Badge tone={entry.date < today ? 'amber' : 'neutral'}>{entry.kind === 'return' ? 'Retorno' : 'Agendado'}{entry.date < today ? ' · data passou' : ''}</Badge></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Abrir prontuário do paciente" onPress={() => router.push(`/patient/${entry.visit.patientId}`)} style={[s.row, { minHeight: 56 }]}><Avatar name={patient?.name || 'Paciente'} color={patient?.color} anonymous={presentation} /><View style={{ flex: 1, gap: 5 }}><Txt style={{ fontFamily: fonts.semibold }}>{presentation ? 'Paciente em apresentação' : patient?.name || 'Paciente não encontrado'}</Txt><Txt muted>{presentation ? 'Localização oculta' : wound?.location || 'Ferida não identificada'}</Txt></View><ChevronRight size={22} color={c.secondary} /></Pressable>
          <Txt muted>{reminderLabel(entry.visit)}{entry.kind === 'return' && !entry.visit.returnTime ? ' · horário padrão: 09:00' : ''}</Txt>
          {!presentation && <Button title={entry.kind === 'return' ? 'Iniciar atendimento de retorno' : 'Iniciar atendimento'} onPress={() => router.push(entry.kind === 'return' ? `/care/new?patientId=${entry.visit.patientId}&woundId=${entry.visit.woundId}` : `/care/new?visitId=${entry.visit.id}`)} />}
          {!presentation && entry.kind === 'appointment' && <><Button title="Alterar data ou horário" variant="outline" onPress={() => setForm(entry.visit)} /><Button title="Cancelar agendamento" variant="ghost" loading={busyId === entry.visit.id} onPress={() => cancel(entry.visit)} /></>}
        </Card>;
      })}
      {!filtered.length && <Empty icon={CalendarDays} title="Nenhum compromisso neste período" description="Escolha outra data, veja todas as datas ou marque um atendimento para um paciente cadastrado." action="Ver todas as datas" onPress={() => { setPeriod('Todas as datas'); setFilter('Todos'); }} />}
    </ScrollView>
    {form && <AppointmentForm visit={form === 'new' ? undefined : form} initialDate={selectedDate} onClose={() => setForm(null)} onSaved={date => { setForm(null); setSelectedDate(date); setPeriod('Dia'); setFilter('Todos'); }} />}
  </View>;
}

function AppointmentForm({ visit, initialDate, onClose, onSaved }: { visit?: Visit; initialDate: string; onClose: () => void; onSaved: (date: string) => void }) {
  const router = useRouter();
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const { reduceMotion } = useMotionPreferences();
  const patients = useStore(state => state.data.patients);
  const wounds = useStore(state => state.data.wounds);
  const save = useStore(state => state.save);
  const [patientId, setPatientId] = useState(visit?.patientId ?? '');
  const [woundId, setWoundId] = useState(visit?.woundId ?? '');
  const [query, setQuery] = useState('');
  const [date, setDate] = useState(visit?.date.slice(0, 10) ?? initialDate);
  const [time, setTime] = useState(visit?.scheduledTime ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const choices = wounds.filter(wound => wound.patientId === patientId);
  const patient = patients.find(item => item.id === patientId);
  const close = () => { if (saving) return; if (patientId !== (visit?.patientId ?? '') || woundId !== (visit?.woundId ?? '') || time !== (visit?.scheduledTime ?? '') || date !== (visit?.date.slice(0, 10) ?? initialDate)) Alert.alert('Descartar agendamento?', 'As alterações ainda não foram salvas.', [{ text: 'Continuar preenchendo', style: 'cancel' }, { text: 'Descartar', style: 'destructive', onPress: onClose }]); else onClose(); };
  const submit = async () => {
    if (!patientId || !woundId) { setError('Escolha o paciente e a ferida para este atendimento.'); return; }
    if (!validCalendarDate(date)) { setError('Selecione uma data válida no calendário.'); return; }
    if (!validTime(time)) { setError('Informe o horário com horas e minutos, de 00:00 a 23:59.'); return; }
    if (new Date(`${date}T${time}:00`).getTime() <= Date.now()) { setError('Escolha uma data e um horário futuros para agendar.'); return; }
    setSaving(true); setError('');
    try { await save('visits', { ...(visit ?? newVisit(uid(), patientId, woundId)), patientId, woundId, date: `${date}T12:00:00`, scheduledTime: time, state: 'Agendado' }); onSaved(date); }
    catch { setError('Não foi possível salvar. Seus dados continuam aqui; tente novamente.'); }
    finally { setSaving(false); }
  };
  return <Modal visible animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={close}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
    <View style={[s.between, { padding: 16 }]}><Txt style={s.h2}>{visit ? 'Alterar agendamento' : 'Agendar atendimento'}</Txt><IconButton icon={X} label="Fechar agendamento" onPress={close} /></View>
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 18, maxWidth: 720, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
      <Field label="Buscar paciente para agendar" value={query} onChangeText={setQuery} placeholder="Nome do paciente" />
      <View style={{ gap: 6 }}>{patients.filter(item => item.status !== 'Arquivado' && item.name.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))).map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: patientId === item.id }} onPress={() => { setPatientId(item.id); setWoundId(''); }} style={{ padding: 16, minHeight: 56, borderWidth: 1, borderRadius: 12, borderColor: patientId === item.id ? c.red : c.border, backgroundColor: patientId === item.id ? c.redSoft : c.surface }}><Txt>{item.name}{patientId === item.id ? ' · selecionado' : ''}</Txt></Pressable>)}</View>
      {!patients.length && <Txt muted>Cadastre um paciente na aba Pacientes antes de agendar.</Txt>}
      {!!patient && <><Txt style={s.h2}>Ferida de {patient.name}</Txt>{choices.map(wound => <Pressable key={wound.id} accessibilityRole="button" accessibilityState={{ selected: woundId === wound.id }} onPress={() => setWoundId(wound.id)} style={{ padding: 16, minHeight: 56, borderWidth: 1, borderRadius: 12, borderColor: woundId === wound.id ? c.red : c.border, backgroundColor: woundId === wound.id ? c.redSoft : c.surface }}><Txt>{wound.location}{woundId === wound.id ? ' · selecionada' : ''}</Txt></Pressable>)}{!choices.length && <Button title="Abrir prontuário para cadastrar ferida" variant="outline" onPress={() => { onClose(); router.push(`/patient/${patientId}`); }} />}</>}
      <DateField label="Data do atendimento" value={date} onChange={setDate} />
      <Field label="Horário (24 horas)" placeholder="Ex.: 14:30" keyboardType="number-pad" maxLength={5} value={time} onChangeText={value => { const digits = value.replace(/\D/g, '').slice(0, 4); setTime(digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits); }} />
      <Txt muted>Ao salvar, o Cicure solicitará permissão para um lembrete no Android. A agenda mostra se o lembrete foi confirmado.</Txt>
      {!!error && <Txt accessibilityLiveRegion="polite" style={{ color: c.red }}>{error}</Txt>}
      <Button title="Salvar agendamento" loading={saving} onPress={() => void submit()} />
    </ScrollView>
  </KeyboardAvoidingView></Modal>;
}
