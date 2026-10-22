import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, FileText, Image as ImageIcon, Ruler, Stethoscope } from 'lucide-react-native';
import { Image, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, Badge, Button, Card, Divider, Field, IconButton, Label, SectionTitle, Txt, safeBack, s } from './components';
import { fonts, useTheme } from './theme';
import { area, dateLabel, number, volume } from '../domain/clinical';
import { useStore, uid } from '../data/store';
import { appendVisitAmendment, visitAuthor } from '../domain/visit.lifecycle';

export function VisitSummary({ visitId }: { visitId?: string }) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;
  const { visits, patients, wounds } = useStore(state => state.data);
  const [amendment, setAmendment] = useState('');
  const [savingAmendment, setSavingAmendment] = useState(false);
  const [amendmentMessage, setAmendmentMessage] = useState('');
  const presentation = useStore(state => state.presentation);
  const visit = visits.find(item => item.id === visitId);
  if (presentation) return <View style={[styles.empty, { backgroundColor: colors.bg }]}><Txt style={s.h2}>Prontuário protegido</Txt><Txt muted>Saia do modo apresentação para abrir os dados do atendimento.</Txt><Button title="Voltar" onPress={() => safeBack(router, '/care')} /></View>;
  if (!visit) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.bg }]}>
        <Txt style={s.h2}>Atendimento não encontrado</Txt>
        <Txt muted>Esse registro pode ter sido removido ou ainda não foi sincronizado.</Txt>
        <Button title="Voltar" onPress={() => safeBack(router, '/care')} />
      </View>
    );
  }
  const patient = patients.find(item => item.id === visit.patientId);
  const wound = wounds.find(item => item.id === visit.woundId);
  if (!patient || !wound) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.bg }]}>
        <Txt style={s.h2}>Prontuário incompleto</Txt>
        <Txt muted>Vincule o atendimento a um paciente e uma ferida para visualizar o resumo.</Txt>
        <Button title="Voltar" onPress={() => safeBack(router, '/care')} />
      </View>
    );
  }
  const previous = visits.filter(item => item.id !== visit.id && item.patientId === visit.patientId && item.woundId === visit.woundId && item.state === 'Concluído' && item.date < visit.date).sort((a, b) => b.date.localeCompare(a.date))[0];
  const hasMeasurement = Boolean(visit.length && visit.width);
  const currentArea = hasMeasurement ? area(visit) : 0;
  const previousArea = previous?.length && previous.width ? area(previous) : 0;
  const reduction = previousArea > 0 ? previousArea - currentArea : null;
  const dateText = visit.date ? format(parseISO(visit.date), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR }) : 'Data não informada';
  const statusText = visit.state === 'Agendado' ? 'Atendimento agendado' : visit.state === 'Rascunho' ? 'Rascunho em andamento' : 'Atendimento concluído';
  const description = visit.state === 'Agendado' ? 'Este atendimento ainda não foi iniciado. Confira o contexto clínico antes de começar o registro.' : visit.plan || 'O atendimento foi registrado, mas ainda não há conduta descrita.';
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={[styles.content, { padding: isNarrow ? 16 : 24, paddingBottom: 160 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.between}>
          <View style={[s.row, { flex: 1, minWidth: 0 }]}>
            <IconButton icon={ChevronLeft} label="Voltar" onPress={() => safeBack(router, patient ? `/patient/${patient.id}` : '/care')} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Label>ATENDIMENTO</Label>
              <Txt style={{ fontFamily: fonts.semibold, fontSize: isNarrow ? 17 : 19 }} numberOfLines={1}>
                Resumo clínico
              </Txt>
            </View>
          </View>
          <IconButton icon={FileText} label="Gerar relatório deste atendimento" color={colors.red} onPress={() => router.push('/reports?visitId=' + visit.id)} />
        </View>

        <Card dark style={styles.hero}>
          <View style={s.between}>
            <View style={[s.row, { flex: 1, minWidth: 0 }]}>
              <Avatar name={patient.name} color={patient.color} size={48} />
              <View style={{ gap: 4, flex: 1, minWidth: 0 }}>
                <Txt style={styles.heroName} numberOfLines={1}>{patient.name}</Txt>
                <Txt style={styles.heroMuted} numberOfLines={1}>{wound.location} · {wound.etiology}</Txt>
              </View>
            </View>
            <Badge dark tone={visit.state === 'Concluído' ? 'green' : visit.state === 'Rascunho' ? 'amber' : 'neutral'}>
              {visit.state}
            </Badge>
          </View>
          <Divider />
          <View style={s.row}>
            <Ruler size={16} color="#D8D8D8" />
            <Txt style={styles.heroMuted} numberOfLines={1}>{dateText}</Txt>
          </View>
        </Card>

        <Card
          style={[
            styles.statusCard,
            isDark
              ? { backgroundColor: 'rgba(255, 77, 77, 0.12)', borderColor: 'rgba(255, 77, 77, 0.25)' }
              : { backgroundColor: colors.redSoft, borderColor: '#F3D2D2' }
          ]}
        >
          <View style={s.row}>
            <View style={[styles.statusIcon, { backgroundColor: isDark ? '#2C2C30' : '#FFF' }]}>
              <Stethoscope size={20} color={colors.red} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt style={{ fontFamily: fonts.semibold, fontSize: 16 }}>{statusText}</Txt>
              <Txt muted style={{ lineHeight: 19, fontSize: 13 }}>{description}</Txt>
            </View>
          </View>
        </Card>

        <View style={{ gap: 12 }}>
          <SectionTitle title="DADOS REGISTRADOS" />
          <Card style={styles.metrics}>
            <Metric label="ÁREA" value={hasMeasurement ? `${number(currentArea)} cm²` : 'Pendente'} />
            <Metric label="VOLUME" value={visit.depth && hasMeasurement ? `${number(volume(visit))} cm³` : 'Pendente'} />
            <Metric label="DOR · EVA" value={visit.pain === null ? 'Não informada' : `${visit.pain}/10`} />
          </Card>
        </View>

        {Boolean(previous && hasMeasurement) && (
          <Card
            style={[
              styles.evolution,
              isDark
                ? { backgroundColor: 'rgba(255, 77, 77, 0.08)', borderColor: 'rgba(255, 77, 77, 0.25)' }
                : { backgroundColor: '#FFF8F8', borderColor: '#F3D2D2' }
            ]}
          >
            <View style={s.between}>
              <View style={{ flex: 1 }}>
                <Label>EVOLUÇÃO</Label>
                <Txt style={{ fontFamily: fonts.semibold, fontSize: 16, marginTop: 4 }}>Comparativo com a última visita</Txt>
              </View>
              <Badge tone={reduction !== null && reduction >= 0 ? 'green' : 'red'}>
                {reduction !== null && reduction >= 0 ? 'redução' : 'atenção'}
              </Badge>
            </View>
            <View style={s.row}>
              <Txt style={styles.evolutionNumber}>{number(previousArea)} cm²</Txt>
              <ChevronRight size={18} color={colors.tertiary} />
              <Txt style={[styles.evolutionNumber, reduction !== null && reduction >= 0 ? { color: colors.green } : { color: colors.red }]}>
                {number(currentArea)} cm²
              </Txt>
            </View>
            <Txt muted style={{ fontSize: 12 }}>
              {reduction === null ? 'Sem mensuração comparável.' : `${reduction >= 0 ? 'Redução' : 'Aumento'} de ${number(Math.abs(reduction))} cm² desde ${dateLabel(previous.date)}.`}
            </Txt>
          </Card>
        )}

        <Card style={{ gap: 11 }}>
          <SectionTitle title="CONDUTA" />
          <Txt style={{ lineHeight: 22, fontSize: 14 }}>
            {visit.plan || 'Nenhuma conduta registrada neste atendimento.'}
          </Txt>
          {Boolean(visit.guidance && visit.guidance.trim()) && (
            <>
              <Divider />
              <Txt muted style={{ lineHeight: 20, fontSize: 13 }}>
                {visit.guidance}
              </Txt>
            </>
          )}
        </Card>

        {visit.completedBy && <Card style={{ gap: 10 }}>
          <SectionTitle title="AUTORIA E CONCLUSÃO" />
          <Txt>{visit.completedBy.name} · {visit.completedBy.council} {visit.completedBy.registration}</Txt>
          <Txt muted>Concluído em {dateLabel(visit.completedAt ?? visit.date, 'dd/MM/yyyy HH:mm')}.</Txt>
          <Txt muted style={{ lineHeight: 23 }}>O registro original é preservado. A conclusão identifica o profissional autenticado; não representa assinatura digital certificada.</Txt>
        </Card>}

        {visit.vitals && Object.values(visit.vitals).some(Boolean) && <Card style={{ gap: 10 }}>
          <SectionTitle title="SINAIS VITAIS REGISTRADOS" />
          <Txt>Pressão arterial: {visit.vitals.systolic || '—'} / {visit.vitals.diastolic || '—'} mmHg</Txt>
          <Txt>Frequência cardíaca: {visit.vitals.heartRate || 'Não medida'}{visit.vitals.heartRate ? ' batimentos/min' : ''}</Txt>
          <Txt>Temperatura: {visit.vitals.temperature || 'Não medida'}{visit.vitals.temperature ? ' °C' : ''}</Txt>
          <Txt>Saturação: {visit.vitals.oxygen || 'Não medida'}{visit.vitals.oxygen ? '%' : ''}</Txt>
          <Txt>Glicemia: {visit.vitals.glucose || 'Não medida'}{visit.vitals.glucose ? ' mg/dL' : ''}</Txt>
        </Card>}

        {visit.soap && <Card style={{ gap: 12 }}>
          <View style={s.between}><SectionTitle title="EVOLUÇÃO CLÍNICA" /><Badge tone={visit.soap.status === 'Confirmado' ? 'green' : 'amber'}>{visit.soap.status}</Badge></View>
          <Txt style={{ fontFamily: fonts.semibold }}>Relato do paciente</Txt><Txt>{visit.soap.subjective}</Txt>
          <Txt style={{ fontFamily: fonts.semibold }}>Exame e medidas</Txt><Txt>{visit.soap.objective}</Txt>
          <Txt style={{ fontFamily: fonts.semibold }}>Avaliação profissional</Txt><Txt>{visit.soap.assessment}</Txt>
          <Txt style={{ fontFamily: fonts.semibold }}>Plano de cuidado</Txt><Txt>{visit.soap.plan}</Txt>
          {visit.soap.confirmedAt && <Txt muted>Revisão confirmada por {visit.soap.confirmedBy} em {dateLabel(visit.soap.confirmedAt, 'dd/MM/yyyy HH:mm')}.</Txt>}
        </Card>}

        {Boolean(visit.returnDate) && <Card style={{ gap: 10 }}>
          <SectionTitle title="RETORNO PREVISTO" />
          <Txt>{dateLabel(visit.returnDate)} às {visit.returnTime || '09:00'}</Txt>
          <Button title="Abrir agenda" variant="outline" onPress={() => router.push('/care')} />
        </Card>}

        {visit.photos.map((photo, index) => <Card key={photo.id} style={{ gap: 10 }}>
          <Txt style={{ fontFamily: fonts.semibold }}>Foto {index + 1} · {photo.type}</Txt>
          <Image source={{ uri: photo.uri }} accessibilityLabel={'Fotografia da ferida em ' + dateLabel(photo.date)} resizeMode="contain" style={{ width: '100%', height: 260, borderRadius: 12 }} />
          <Txt muted>{dateLabel(photo.date, 'dd/MM/yyyy HH:mm')} · {photo.rulerConfirmed ? 'Referência: ' + number(photo.referenceCm ?? 0) + ' cm' : 'Sem referência de escala'}</Txt>
        </Card>)}

        {visit.state === 'Concluído' && <View style={{ gap: 14 }}>
          <SectionTitle title="ADENDOS E CORREÇÕES" />
          {(visit.amendments ?? []).map(item => <Card key={item.id} style={{ gap: 10 }}>
            <Txt>{item.text}</Txt>
            <Txt muted>{item.author.name} · {item.author.council} {item.author.registration}</Txt>
            <Txt muted>{dateLabel(item.createdAt, 'dd/MM/yyyy HH:mm')}</Txt>
          </Card>)}
          <Txt muted>Acrescente informações ou correções. O atendimento e os adendos anteriores serão preservados.</Txt>
          <Field label="Novo adendo" value={amendment} onChangeText={setAmendment} multiline placeholder="Descreva a informação acrescentada ou a correção e seu motivo." />
          <Button title="Salvar adendo" loading={savingAmendment} disabled={!amendment.trim()} onPress={() => {
            setSavingAmendment(true); setAmendmentMessage('');
            void (async () => {
              try {
                const current = useStore.getState();
                const latest = current.data.visits.find(item => item.id === visit.id);
                if (!latest) throw new Error('O atendimento não está mais disponível. Abra o prontuário novamente.');
                const profile = current.data.profiles.find(item => item.id === current.authUserId) ?? current.data.profiles[0];
                const next = appendVisitAmendment(latest, amendment, visitAuthor(current.authUserId, profile), uid());
                await current.save('visits', next);
                setAmendment(''); setAmendmentMessage('Adendo salvo neste aparelho. O registro original foi preservado.');
              } catch (error) { setAmendmentMessage(error instanceof Error ? error.message : 'Não foi possível salvar o adendo. Tente novamente.'); }
              finally { setSavingAmendment(false); }
            })();
          }} />
          {Boolean(amendmentMessage) && <Txt accessibilityLiveRegion="polite">{amendmentMessage}</Txt>}
        </View>}

        <Card style={{ gap: 13 }}>
          <View style={s.between}>
            <SectionTitle title="REGISTROS DO ATENDIMENTO" />
            <Badge tone={visit.photos.length ? 'green' : 'neutral'}>{visit.photos.length} foto(s)</Badge>
          </View>
          <View style={styles.recordRow}>
            <Txt style={[styles.recordNumber, { color: colors.red }]}>{visit.assessments.length}</Txt>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontFamily: fonts.semibold }}>Escalas aplicadas</Txt>
              <Txt muted style={{ fontSize: 12 }}>
                {visit.assessments.length ? visit.assessments.map(item => item.code).join(' · ') : 'Nenhuma escala registrada'}
              </Txt>
            </View>
          </View>
          <View style={styles.recordRow}>
            <Txt style={[styles.recordNumber, { color: colors.red }]}>{visit.dressings.length}</Txt>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontFamily: fonts.semibold }}>Produtos e coberturas</Txt>
              <Txt muted style={{ fontSize: 12 }}>
                {visit.dressings.length ? visit.dressings.map(item => item.product).join(' · ') : 'Nenhum produto registrado'}
              </Txt>
            </View>
          </View>
          <View style={styles.recordRow}>
            <ImageIcon size={19} color={colors.red} />
            <View style={{ flex: 1 }}>
              <Txt style={{ fontFamily: fonts.semibold }}>Fotos clínicas</Txt>
              <Txt muted style={{ fontSize: 12 }}>
                {visit.photos.length ? 'Anexadas ao atendimento' : 'Nenhuma foto anexada'}
              </Txt>
            </View>
          </View>
        </Card>

        <View style={styles.actions}>
          {visit.state !== 'Concluído' && <Button
            title={visit.state === 'Rascunho' ? 'Continuar atendimento' : 'Iniciar atendimento'}
            icon={ChevronRight}
            onPress={() => router.push(`/care/new?visitId=${visit.id}`)}
          />}
          {visit.state === 'Concluído' && <Button title="Gerar relatório deste atendimento" icon={FileText} onPress={() => router.push('/reports?visitId=' + visit.id)} />}
          <Button
            title="Ver prontuário do paciente"
            variant="outline"
            onPress={() => router.push(`/patient/${patient.id}`)}
          />
        </View>
      </ScrollView>
    </View>
  );
}
function Metric({ label, value }: { label: string; value: string }) { return <View style={{ flex: 1, minWidth: 80, gap: 4 }}><Label>{label}</Label><Txt style={styles.metricValue}>{value}</Txt></View>; }
const styles = StyleSheet.create({ content: { padding: 24, paddingTop: 20, paddingBottom: 160, gap: 16, width: '100%', maxWidth: 840, alignSelf: 'center' }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }, hero: { padding: 18, gap: 14 }, heroName: { color: '#FFF', fontFamily: fonts.semibold, fontSize: 18 }, heroMuted: { color: '#C5C5C5', fontSize: 12 }, statusCard: { padding: 16 }, statusIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 }, metricValue: { fontFamily: fonts.semibold, fontSize: 16 }, evolution: { padding: 18, gap: 12 }, evolutionNumber: { fontFamily: fonts.brand, fontSize: 22 }, recordRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 }, recordNumber: { width: 28, fontFamily: fonts.brand, fontSize: 20 }, actions: { gap: 10 } });
