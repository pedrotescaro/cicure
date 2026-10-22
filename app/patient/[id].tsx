import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ArrowLeft, CalendarPlus, ChevronRight, ClipboardList, FileCheck2, Files, MapPin, Pencil, Plus, Share2, ShieldCheck } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Accordion, Avatar, Badge, Button, Card, Empty, IconButton, SectionTitle, Txt, safeBack, s } from '../../src/ui/components';
import { fonts, useTheme } from '../../src/ui/theme';
import { age, dateLabel, number } from '../../src/domain/clinical';
import { useStore } from '../../src/data/store';
import { PatientForm } from '../../src/features/patients/ui/PatientForm';
import { WoundForm } from '../../src/features/patients/ui/WoundForm';
import type { Wound } from '../../src/domain/types';

export default function PatientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors: c } = useTheme();
  const { patients, wounds, visits } = useStore(state => state.data);
  const presentation = useStore(state => state.presentation);
  const [editing, setEditing] = useState(false);
  const [woundForm, setWoundForm] = useState<Wound | 'new' | null>(null);
  const [selectedWound, setSelectedWound] = useState('');
  const patient = patients.find(item => item.id === id);
  const patientWounds = wounds.filter(item => item.patientId === id);
  const selected = patientWounds.find(item => item.id === selectedWound);
  const patientVisits = visits.filter(item => item.patientId === id && (!selectedWound || item.woundId === selectedWound)).sort((a, b) => b.date.localeCompare(a.date));
  if (!patient) return <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}><Empty title="Paciente não encontrado" description="Volte à lista para selecionar um paciente disponível nesta conta." action="Voltar para pacientes" onPress={() => safeBack(router, '/patients')} /></View>;
  if (presentation) return <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}><Empty title="Identificação protegida" description="Desative o modo apresentação no Menu para abrir o prontuário e registrar um atendimento." action="Voltar para pacientes" onPress={() => safeBack(router, '/patients')} /></View>;
  return <View style={{ flex: 1, backgroundColor: c.bg }}>
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 22, maxWidth: 840, width: '100%', alignSelf: 'center' }}>
      <View style={s.between}><IconButton icon={ArrowLeft} label="Voltar para pacientes" onPress={() => safeBack(router, '/patients')} /><Button title="Editar dados" small variant="outline" icon={Pencil} onPress={() => setEditing(true)} /></View>
      <View style={s.row}><Avatar name={patient.name} color={patient.color} size={60} /><View style={{ flex: 1, gap: 6 }}><Txt accessibilityRole="header" style={{ fontFamily: fonts.semibold, fontSize: 24 }}>{patient.name}</Txt><Txt muted>{patient.birthDate ? `${age(patient.birthDate)} anos · ` : ''}{patient.status}</Txt></View></View>
      <Button title="Novo atendimento" icon={CalendarPlus} onPress={() => router.push(`/care/new?patientId=${id}${selectedWound ? `&woundId=${selectedWound}` : ''}`)} />
      <Accordion title="Dados do paciente" subtitle="Identificação, contato e informações de saúde">
        <DataRow label="Nome completo" value={patient.name} /><DataRow label="Nascimento" value={patient.birthDate ? dateLabel(patient.birthDate) : ''} /><DataRow label="Sexo registrado" value={patient.sex} /><DataRow label="CPF" value={patient.cpf} /><DataRow label="Cartão SUS" value={patient.sus} /><DataRow label="Telefone" value={patient.phone} /><DataRow label="Endereço" value={patient.address} /><DataRow label="Contato de emergência" value={patient.emergency} />
        <DataRow label="Alergias registradas" value={patient.allergies.join(', ')} /><DataRow label="Doenças e condições de saúde" value={patient.comorbidities.map(item => item.name).join(', ')} />
        <DataRow label="Peso" value={patient.weight > 0 ? `${number(patient.weight)} kg` : ''} /><DataRow label="Altura" value={patient.height > 0 ? `${number(patient.height)} cm` : ''} /><DataRow label="Tipo sanguíneo" value={patient.bloodType} /><DataRow label="Tabagismo" value={patient.smoking} /><DataRow label="Consumo de álcool" value={patient.alcohol} /><DataRow label="Atividade física" value={patient.activity} />
        <DataRow label="Medicamentos em uso" value={patient.medications.map(item => `${item.name} ${item.dose} · ${item.frequency}`).join('\n')} /><DataRow label="Exames registrados" value={patient.exams.map(item => `${item.type}: ${item.value} · ${dateLabel(item.date)}`).join('\n')} />
        <Button title="Editar cadastro" variant="outline" onPress={() => setEditing(true)} />
      </Accordion>
      <View style={{ gap: 12 }}>
        <SectionTitle title="Feridas" action="Ver mapa corporal" onPress={() => router.push(`/patient/${id}/body-map`)} />
        <Txt muted>Escolha uma ferida para acompanhar seu histórico e iniciar o atendimento com a localização identificada.</Txt>
        {patientWounds.map((wound, index) => <Card key={wound.id} style={{ gap: 14, borderColor: selectedWound === wound.id ? c.red : c.border }}>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: selectedWound === wound.id }} accessibilityLabel={`Selecionar ferida ${index + 1}, ${wound.location}`} onPress={() => setSelectedWound(selectedWound === wound.id ? '' : wound.id)} style={{ gap: 10, minHeight: 48 }}>
            <View style={s.between}><Txt style={[s.h2, { flex: 1 }]}>Ferida {index + 1} · {wound.location}</Txt><MapPin size={22} color={selectedWound === wound.id ? c.red : c.secondary} /></View>
            <View style={[s.row, { flexWrap: 'wrap' }]}><Badge tone={wound.status === 'Piora' ? 'red' : wound.status === 'Estagnada' ? 'amber' : 'neutral'}>{wound.status}</Badge><Txt muted>{wound.etiology}</Txt></View>
            <Txt muted>Início: {wound.startDate ? dateLabel(wound.startDate) : 'não informado'}</Txt>
            {!!wound.previousTreatments && <Txt muted>Histórico: {wound.previousTreatments}</Txt>}
            {selectedWound === wound.id && <Txt style={{ color: c.red }}>Ferida selecionada para o histórico abaixo</Txt>}
          </Pressable>
          <Button title="Atender esta ferida" icon={CalendarPlus} onPress={() => router.push(`/care/new?patientId=${id}&woundId=${wound.id}`)} />
          <Button title="Editar ferida" variant="outline" icon={Pencil} onPress={() => setWoundForm(wound)} />
        </Card>)}
        {!patientWounds.length && <Txt muted>Este paciente ainda não tem ferida cadastrada. Cadastre uma para iniciar o acompanhamento.</Txt>}
        <Button title="Cadastrar nova ferida" icon={Plus} variant="outline" onPress={() => setWoundForm('new')} />
      </View>
      <View style={{ gap: 12 }}>
        <SectionTitle title="Atendimentos e evolução" action="Ver histórico completo" onPress={() => router.push(`/patient/${id}/timeline${selectedWound ? `?woundId=${selectedWound}` : ''}`)} />
        <Button title="Ver fotos e comparar evolução" variant="outline" onPress={() => router.push(`/patient/${id}/photos${selectedWound ? `?woundId=${selectedWound}` : ''}`)} />
        <Txt muted>{selected ? `Histórico de: ${selected.location}` : 'Histórico de todas as feridas deste paciente'}</Txt>
        {!!selectedWound && <Button title="Mostrar todas as feridas" variant="ghost" onPress={() => setSelectedWound('')} />}
        {patientVisits.slice(0, 6).map(visit => <Pressable key={visit.id} accessibilityRole="button" onPress={() => router.push(visit.state === 'Concluído' ? `/care/${visit.id}` : `/care/new?visitId=${visit.id}`)}><Card style={{ padding: 16 }}><View style={s.between}><View style={{ flex: 1, gap: 8 }}><Txt style={{ fontFamily: fonts.semibold }}>{dateLabel(visit.date)} · {visit.state}</Txt><Txt muted>{patientWounds.find(wound => wound.id === visit.woundId)?.location || 'Ferida não identificada'}</Txt><Txt muted>{visit.length && visit.width ? `${visit.length} × ${visit.width} cm` : 'Sem medidas registradas'}</Txt></View><ChevronRight size={22} color={c.secondary} /></View></Card></Pressable>)}
        {!patientVisits.length && <Txt muted>Sem atendimentos registrados{selected ? ' para esta ferida' : ''}.</Txt>}
      </View>
      <View style={{ gap: 10 }}>
        <SectionTitle title="Plano de cuidado e documentos" />
        {[{ label: 'Plano de cuidado', route: 'care-plan', Icon: FileCheck2 }, { label: 'Prescrições', route: 'prescription/new', Icon: ClipboardList }, { label: 'Documentos e anexos', route: 'documents', Icon: Files }, { label: 'Consentimentos', route: 'consents', Icon: ShieldCheck }, { label: 'Encaminhamentos', route: 'referrals', Icon: Share2 }].map(({ label, route, Icon }) => <Button key={route} title={label} icon={Icon} variant="outline" onPress={() => router.push(`/patient/${id}/${route}` as never)} />)}
      </View>
    </ScrollView>
    {editing && <PatientForm patient={patient} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} />}
    {woundForm && <WoundForm patientId={patient.id} wound={woundForm === 'new' ? undefined : woundForm} onClose={() => setWoundForm(null)} onSaved={wound => { setWoundForm(null); setSelectedWound(wound.id); }} />}
  </View>;
}

function DataRow({ label, value }: { label: string; value: string }) { return <View style={{ gap: 5 }}><Txt style={{ fontFamily: fonts.semibold }}>{label}</Txt><Txt muted>{value || 'Não informado'}</Txt></View>; }
