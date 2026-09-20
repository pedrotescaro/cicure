import React, { useMemo } from 'react';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { 
  ArrowLeft, 
  CalendarPlus, 
  ChevronRight, 
  ClipboardPlus, 
  Ruler, 
  Stethoscope,
  Clock,
  Layers,
  FileCheck2,
  FileSpreadsheet,
  Files,
  ShieldCheck,
  Share2
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Accordion, Avatar, Badge, Button, Card, Choices, Divider, IconButton, Label, SectionTitle, Txt, safeBack, s } from '../../src/ui/components';
import { fonts, useTheme } from '../../src/ui/theme';
import { age, dateLabel, number } from '../../src/domain/clinical';
import { useStore } from '../../src/data/store';
import { evaluateClinicalAlerts } from '../../src/features/alerts/domain/alert-rules';
import { AlertBanner } from '../../src/features/alerts/ui/AlertBanner';
import { HomeVisitModeBanner } from '../../src/features/home-visit/ui/HomeVisitModeBanner';

export default function PatientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors: c, isDark } = useTheme();
  const { patients, wounds, visits } = useStore(st => st.data);
  const presentation = useStore(st => st.presentation);

  const patient = patients.find(p => p.id === id);
  const patientWounds = wounds.filter(w => w.patientId === id);
  const patientVisits = visits.filter(v => v.patientId === id).sort((a, b) => b.date.localeCompare(a.date));

  // Avaliação de alertas clínicos automáticos baseados nos dados registrados
  const alerts = useMemo(() => {
    if (!patient) return [];
    return evaluateClinicalAlerts(patient, patientWounds, patientVisits);
  }, [patient, patientWounds, patientVisits]);

  if (!patient) {
    return (
      <View style={{ flex: 1, padding: 24, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Txt>Paciente não encontrado.</Txt>
        <Button title="Voltar" onPress={() => safeBack(router, '/patients')} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 80, gap: 16, width: '100%', maxWidth: 840, alignSelf: 'center' }}>
        {/* Header com Navegação */}
        <View style={s.between}>
          <IconButton icon={ArrowLeft} label="Voltar" onPress={() => safeBack(router, '/patients')} />
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <IconButton 
              icon={CalendarPlus} 
              label="Novo atendimento" 
              color={c.red} 
              onPress={() => router.push(`/care/new?patientId=${id}`)} 
            />
          </View>
        </View>

        {/* Perfil do Paciente */}
        <View style={s.row}>
          <Avatar name={patient.name} color={patient.color} size={66} anonymous={presentation} />
          <View style={{ flex: 1, gap: 5 }}>
            <Txt style={{ fontFamily: fonts.semibold, fontSize: 22 }}>
              {presentation ? 'Paciente em apresentação' : patient.name}
            </Txt>
            <Txt muted>
              {presentation ? 'Identificação oculta' : `${patient.sex} · ${age(patient.birthDate)} anos · ${patient.status}`}
            </Txt>
          </View>
        </View>

        {/* Banner Modo Visita Domiciliar */}
        <HomeVisitModeBanner 
          onStartVisit={() => router.push(`/care/new?patientId=${id}`)} 
        />

        {/* Alertas Clínicos Automáticos */}
        <AlertBanner alerts={alerts} />

        {/* BARRA DE FERRAMENTAS CLÍNICAS (Prompt 2 Extensions) */}
        <Card style={styles.quickToolsCard}>
          <SectionTitle title="FERRAMENTAS CLÍNICAS DO PRONTUÁRIO" />
          <View style={styles.toolsGrid}>
            <Pressable 
              onPress={() => router.push(`/patient/${id}/timeline` as never)}
              style={[styles.toolBtn, { backgroundColor: isDark ? '#222226' : '#FAFAFA', borderColor: c.border }]}
            >
              <Clock size={20} color={c.red} />
              <Txt style={styles.toolLabel}>Linha do Tempo</Txt>
            </Pressable>

            <Pressable 
              onPress={() => router.push(`/patient/${id}/body-map` as never)}
              style={[styles.toolBtn, { backgroundColor: isDark ? '#222226' : '#FAFAFA', borderColor: c.border }]}
            >
              <Layers size={20} color={c.amber} />
              <Txt style={styles.toolLabel}>Mapa Corporal</Txt>
            </Pressable>

            <Pressable 
              onPress={() => router.push(`/patient/${id}/care-plan` as never)}
              style={[styles.toolBtn, { backgroundColor: isDark ? '#222226' : '#FAFAFA', borderColor: c.border }]}
            >
              <FileCheck2 size={20} color={c.green} />
              <Txt style={styles.toolLabel}>Plano Terapêutico</Txt>
            </Pressable>

            <Pressable 
              onPress={() => router.push(`/patient/${id}/prescription/new` as never)}
              style={[styles.toolBtn, { backgroundColor: isDark ? '#222226' : '#FAFAFA', borderColor: c.border }]}
            >
              <FileSpreadsheet size={20} color={c.red} />
              <Txt style={styles.toolLabel}>Prescrição</Txt>
            </Pressable>

            <Pressable 
              onPress={() => router.push(`/patient/${id}/documents` as never)}
              style={[styles.toolBtn, { backgroundColor: isDark ? '#222226' : '#FAFAFA', borderColor: c.border }]}
            >
              <Files size={20} color={c.secondary} />
              <Txt style={styles.toolLabel}>Documentos</Txt>
            </Pressable>

            <Pressable 
              onPress={() => router.push(`/patient/${id}/consents` as never)}
              style={[styles.toolBtn, { backgroundColor: isDark ? '#222226' : '#FAFAFA', borderColor: c.border }]}
            >
              <ShieldCheck size={20} color={c.green} />
              <Txt style={styles.toolLabel}>Consentimentos</Txt>
            </Pressable>

            <Pressable 
              onPress={() => router.push(`/patient/${id}/referrals` as never)}
              style={[styles.toolBtn, { backgroundColor: isDark ? '#222226' : '#FAFAFA', borderColor: c.border }]}
            >
              <Share2 size={20} color={c.secondary} />
              <Txt style={styles.toolLabel}>Encaminhamentos</Txt>
            </Pressable>
          </View>
        </Card>

        {/* Feridas do Paciente */}
        <View style={{ gap: 10 }}>
          <SectionTitle 
            title="FERIDAS DO PACIENTE" 
            action="Ver no Mapa" 
            onPress={() => router.push(`/patient/${id}/body-map` as never)} 
          />
          {patientWounds.map(w => (
            <Pressable key={w.id} onPress={() => router.push(`/care/new?patientId=${id}&woundId=${w.id}`)}>
              <Card style={{ padding: 18, gap: 12 }}>
                <View style={s.between}>
                  <View style={{ gap: 6, flex: 1 }}>
                    <Txt style={{ fontFamily: fonts.semibold, fontSize: 16 }}>
                      {presentation ? 'Localização oculta' : w.location}
                    </Txt>
                    <View style={s.row}>
                      <Badge tone={w.status === 'Estagnada' ? 'amber' : 'green'}>{w.status}</Badge>
                      <Badge>{w.etiology}</Badge>
                    </View>
                  </View>
                  <ChevronRight size={19} color={c.tertiary} />
                </View>
                <View style={s.row}>
                  <Ruler size={15} color={c.secondary} />
                  <Txt muted style={{ fontSize: 12 }}>
                    Início {dateLabel(w.startDate)} · {Math.max(0, Math.floor((Date.now() - Date.parse(w.startDate)) / 86400000))} dias de evolução
                  </Txt>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>

        {/* Accordions Existentes Preservados */}
        <Accordion title="Identificação" subtitle="Dados pessoais e contato" initialOpen={false}>
          <FieldRow label="Nome completo" value={presentation ? 'Oculto no modo apresentação' : patient.name} />
          <FieldRow label="Nascimento · idade" value={presentation ? 'Oculto' : `${dateLabel(patient.birthDate)} · ${age(patient.birthDate)} anos`} />
          <FieldRow label="Sexo" value={presentation ? 'Oculto' : patient.sex} />
          <FieldRow label="CPF · Cartão SUS" value={presentation ? 'Oculto' : `${patient.cpf || 'Não informado'} · ${patient.sus || 'Não informado'}`} />
          <FieldRow label="Telefone" value={presentation ? 'Oculto' : patient.phone || 'Não informado'} />
          <FieldRow label="Endereço" value={presentation ? 'Oculto' : patient.address} />
          <FieldRow label="Contato de emergência" value={presentation ? 'Oculto' : patient.emergency || 'Não informado'} />
        </Accordion>

        <Accordion title="Dados clínicos" subtitle="Medidas, hábitos e alergias">
          <View style={styles.grid}>
            <FieldRow label="Peso" value={`${number(patient.weight)} kg`} />
            <FieldRow label="Altura" value={`${number(patient.height / 100)} m`} />
            <FieldRow label="IMC" value={`${number(patient.weight / ((patient.height / 100) ** 2))} kg/m²`} />
            <FieldRow label="Tipo sanguíneo" value={patient.bloodType} />
          </View>
          <Divider />
          <Label>ALERGIAS</Label>
          <Choices options={patient.allergies.length ? patient.allergies : ['Nenhuma registrada']} value={patient.allergies} onChange={() => {}} multiple />
          <FieldRow label="Tabagismo" value={patient.smoking} />
          <FieldRow label="Etilismo" value={patient.alcohol} />
          <FieldRow label="Atividade física" value={patient.activity} />
        </Accordion>

        <Accordion title="Comorbidades" subtitle={`${patient.comorbidities.length} registradas`}>
          <View style={{ gap: 12 }}>
            {patient.comorbidities.map(cmb => (
              <View key={cmb.name} style={s.between}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt style={{ fontFamily: fonts.medium }}>{cmb.name}</Txt>
                  <Txt muted style={{ fontSize: 12 }}>Diagnóstico {dateLabel(cmb.date)}{cmb.note ? ` · ${cmb.note}` : ''}</Txt>
                </View>
                <Badge tone="red">ativa</Badge>
              </View>
            ))}
          </View>
        </Accordion>

        <Accordion title="Medicamentos em uso" subtitle={`${patient.medications.length} em uso`}>
          <View style={{ gap: 12 }}>
            {patient.medications.map(med => (
              <View key={med.name} style={s.between}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt style={{ fontFamily: fonts.medium }}>{med.name} · {med.dose}</Txt>
                  <Txt muted style={{ fontSize: 12 }}>{med.route} · {med.frequency} · {med.indication}</Txt>
                </View>
                {med.attention && <Badge tone="amber">atenção</Badge>}
              </View>
            ))}
          </View>
        </Accordion>

        <Accordion title="Exames relevantes" subtitle={`${patient.exams.length} registros`}>
          <View style={{ gap: 12 }}>
            {patient.exams.map(exam => (
              <View key={`${exam.type}-${exam.date}`} style={s.between}>
                <View>
                  <Txt style={{ fontFamily: fonts.medium }}>{exam.type}</Txt>
                  <Txt muted style={{ fontSize: 12 }}>{exam.value} · {dateLabel(exam.date)}</Txt>
                </View>
                <Badge>{exam.attachment ? 'anexo' : 'sem anexo'}</Badge>
              </View>
            ))}
          </View>
        </Accordion>

        {/* Histórico de Atendimentos */}
        <View style={{ gap: 12 }}>
          <SectionTitle 
            title="HISTÓRICO DE ATENDIMENTOS" 
            action="Ver Linha do Tempo" 
            onPress={() => router.push(`/patient/${id}/timeline` as never)} 
          />
          {patientVisits.slice(0, 4).map(v => (
            <Pressable key={v.id} onPress={() => router.push(`/care/${v.id}` as never)}>
              <Card style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt style={{ fontFamily: fonts.medium }}>{dateLabel(v.date)} · {v.state}</Txt>
                  <Txt muted style={{ fontSize: 12 }}>
                    {v.length && v.width ? `${v.length} × ${v.width} cm · ${number(Number(v.length) * Number(v.width))} cm²` : 'Rascunho sem mensuração'}
                  </Txt>
                </View>
                <ChevronRight size={17} color={c.tertiary} />
              </Card>
            </Pressable>
          ))}
        </View>

        <Button title="Iniciar atendimento" icon={CalendarPlus} onPress={() => router.push(`/care/new?patientId=${id}`)} />
      </ScrollView>
    </View>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) { 
  return <View style={{ gap: 4, flex: 1 }}><Label>{label}</Label><Txt>{value}</Txt></View>; 
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  quickToolsCard: { gap: 14 },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toolBtn: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  toolLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
  }
});
