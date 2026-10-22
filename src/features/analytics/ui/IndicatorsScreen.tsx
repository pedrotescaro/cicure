import { useState } from 'react';
import { View } from 'react-native';
import { useStore } from '../../../data/store';
import { Button, Choices, Txt } from '../../../ui/components';
import { useRouter } from 'expo-router';
import { SupportPage, supportStyles as s } from '../../support/ui/SupportPage';
import { summarizeIndicators, type IndicatorPeriod } from '../domain/indicators.service';

const dateBR = (value: string) => value.split('-').reverse().join('/');
export default function IndicatorsScreen() {
  const router = useRouter();
  const data = useStore(st => st.data);
  const [period, setPeriod] = useState<IndicatorPeriod>('Últimos 30 dias');
  const summary = summarizeIndicators(data.patients, data.wounds, data.visits, period);
  const rows: [string, number | string][] = [['Atendimentos concluídos', summary.completedVisits], ['Pacientes atendidos', summary.patientsAttended], ['Atendimentos em rascunho', summary.drafts], ['Agendamentos ainda sem conclusão', summary.scheduledVisits]];
  return <SupportPage title="Resumo dos atendimentos" subtitle="Números calculados a partir dos registros da sua conta.">
    <Txt style={s.heading}>Escolha o período</Txt><Choices options={['Últimos 30 dias', 'Últimos 90 dias', 'Ano atual']} value={period} onChange={value => setPeriod(value as IndicatorPeriod)} />
    <Txt muted>{dateBR(summary.since)} até {dateBR(summary.today)}</Txt>
    <View style={s.section}>{rows.map(([label, value]) => <View key={label} style={{ flexDirection: 'row', gap: 16, justifyContent: 'space-between', paddingVertical: 12 }}><Txt style={[s.body, { flex: 1 }]}>{label}</Txt><Txt style={s.heading}>{value}</Txt></View>)}</View>
    {!summary.completedVisits && <Txt muted style={s.body}>Nenhum atendimento concluído neste período. Os números serão atualizados conforme você concluir e salvar os atendimentos.</Txt>}
    <Txt style={s.heading}>Situação atual do prontuário</Txt><Txt muted>Estes totais consideram todos os registros salvos, em qualquer período.</Txt>
    <Txt style={s.body}>{summary.activePatients} paciente(s) ativo(s) · {summary.activeWounds} ferida(s) em acompanhamento · {summary.healedWounds} ferida(s) registradas como cicatrizadas.</Txt>
    <Txt style={s.heading}>Retornos para conferir</Txt>
    <Txt muted style={s.body}>Último atendimento de cada ferida com data de retorno já passada. Confira o prontuário antes de entrar em contato com o paciente.</Txt>
    {!summary.lateReturns.length ? <Txt>Nenhum retorno passado nos registros atuais.</Txt> : summary.lateReturns.map(visit => <View key={visit.id} style={s.section}><Txt style={s.body}>{data.patients.find(p => p.id === visit.patientId)?.name} · retorno previsto em {dateBR(visit.returnDate)}</Txt><Button title="Abrir prontuário do paciente" variant="outline" onPress={() => router.push(`/patient/${visit.patientId}` as never)} /></View>)}
    <Txt style={s.heading}>Medidas registradas no período</Txt>
    <Txt style={s.body}>{summary.averageArea === null ? 'Sem medidas completas de comprimento e largura nos atendimentos concluídos.' : `Área retangular média: ${summary.averageArea.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} cm² em ${summary.measuredVisits} atendimento(s).`}</Txt>
    <Txt muted style={s.body}>A área retangular é comprimento × largura. Este resumo não estima risco, eficácia do tratamento ou prognóstico.</Txt>
    <Txt style={s.heading}>Causas registradas para as feridas</Txt>
    {Object.entries(summary.etiologyCounts).length ? Object.entries(summary.etiologyCounts).sort((a, b) => b[1] - a[1]).map(([label, count]) => <Txt key={label}>{label}: {count}</Txt>) : <Txt muted>Nenhuma ferida cadastrada.</Txt>}
  </SupportPage>;
}
