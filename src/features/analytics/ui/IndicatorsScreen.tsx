import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, TrendingUp, Users, HeartPulse, CheckCircle2, Clock, PieChart, Activity } from 'lucide-react-native';
import { useStore } from '../../../data/store';
import { Badge, Card, IconButton, Label, Pills, SectionTitle, Txt, safeBack, s } from '../../../ui/components';
import { colors as c, fonts } from '../../../ui/theme';
import { area, number } from '../../../domain/clinical';

export default function IndicatorsScreen() {
  const router = useRouter();
  const { patients, wounds, visits } = useStore(st => st.data);
  const [period, setPeriod] = useState('Últimos 30 dias');
  const [profFilter, setProfFilter] = useState('Todos');

  const activePatients = patients.filter(p => p.status === 'Ativo').length;
  const activeWounds = wounds.filter(w => w.status === 'Em cicatrização' || w.status === 'Ativa' || w.status === 'Estagnada').length;
  const healedWounds = wounds.filter(w => w.status === 'Cicatrizada').length;
  const completedVisits = visits.filter(v => v.state === 'Concluído').length;

  // Retornos atrasados
  const todayStr = new Date().toISOString().slice(0, 10);
  const lateReturns = visits.filter(v => v.state === 'Concluído' && v.returnDate && v.returnDate < todayStr).length;

  // Evolução média da área
  const areas = visits.filter(v => v.state === 'Concluído' && v.length && v.width).map(area);
  const avgArea = areas.length ? areas.reduce((a, b) => a + b, 0) / areas.length : 0;

  // Distribuição por etiologia
  const etiologyCounts: Record<string, number> = {};
  wounds.forEach(w => {
    etiologyCounts[w.etiology] = (etiologyCounts[w.etiology] || 0) + 1;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Voltar" onPress={() => safeBack(router, '/more')} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={styles.headerTitle}>Indicadores Clínicos</Txt>
          <Txt muted style={{ fontSize: 13 }}>Métricas longitudinais de desfecho</Txt>
        </View>
      </View>

      {/* Filtros em Pills */}
      <View style={styles.filterBar}>
        <Pills 
          options={['Últimos 30 dias', 'Últimos 90 dias', 'Ano atual']} 
          value={period} 
          onChange={setPeriod} 
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Grid de Métricas Principais */}
        <View style={styles.metricsGrid}>
          <Card style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Users size={18} color={c.red} />
            </View>
            <Txt style={styles.metricValue}>{activePatients}</Txt>
            <Label>PACIENTES ATIVOS</Label>
          </Card>

          <Card style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <HeartPulse size={18} color={c.red} />
            </View>
            <Txt style={styles.metricValue}>{activeWounds}</Txt>
            <Label>FERIDAS ATIVAS</Label>
          </Card>

          <Card style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: c.greenSoft }]}>
              <CheckCircle2 size={18} color={c.green} />
            </View>
            <Txt style={[styles.metricValue, { color: c.green }]}>{healedWounds}</Txt>
            <Label>CICATRIZADAS</Label>
          </Card>

          <Card style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Activity size={18} color={c.red} />
            </View>
            <Txt style={styles.metricValue}>{completedVisits}</Txt>
            <Label>ATENDIMENTOS</Label>
          </Card>
        </View>

        {/* Métrica de Área Média e Retornos */}
        <Card style={{ gap: 12 }}>
          <SectionTitle title="EFICÁCIA E ACOMPANHAMENTO" />
          <View style={s.between}>
            <View style={{ gap: 2 }}>
              <Txt muted style={{ fontSize: 12 }}>Área Média das Lesões</Txt>
              <Txt style={{ fontFamily: fonts.bold, fontSize: 24 }}>
                {number(avgArea)} cm²
              </Txt>
            </View>
            <View style={{ gap: 2, alignItems: 'flex-end' }}>
              <Txt muted style={{ fontSize: 12 }}>Retornos Atrasados</Txt>
              <Txt style={{ fontFamily: fonts.bold, fontSize: 24, color: lateReturns > 0 ? c.red : c.green }}>
                {lateReturns}
              </Txt>
            </View>
          </View>
        </Card>

        {/* Distribuição por Etiologia */}
        <Card style={{ gap: 12 }}>
          <View style={s.between}>
            <SectionTitle title="DISTRIBUIÇÃO POR ETIOLOGIA" />
            <PieChart size={18} color={c.secondary} />
          </View>

          <View style={{ gap: 10 }}>
            {Object.entries(etiologyCounts).map(([etio, count]) => {
              const pct = wounds.length ? Math.round((count / wounds.length) * 100) : 0;
              return (
                <View key={etio} style={{ gap: 4 }}>
                  <View style={s.between}>
                    <Txt style={{ fontSize: 13, fontFamily: fonts.medium }}>{etio}</Txt>
                    <Txt muted style={{ fontSize: 12 }}>{count} ({pct}%)</Txt>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Aviso de Conduta Ética */}
        <Card style={{ backgroundColor: '#F9F9F9', gap: 6 }}>
          <Txt style={{ fontFamily: fonts.semibold, fontSize: 13, color: c.secondary }}>
            Diretriz Ética de Uso de Indicadores
          </Txt>
          <Txt muted style={{ fontSize: 12, lineHeight: 18 }}>
            O Cicure não apresenta rankings de desfecho entre profissionais da clínica. A velocidade de cicatrização varia amplamente com comorbidades sistêmicas, idade e aderência do paciente.
          </Txt>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  headerTitle: { fontFamily: fonts.brand, fontSize: 22 },
  filterBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  content: { padding: 16, gap: 16, paddingBottom: 100 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: { flex: 1, minWidth: '45%', padding: 16, gap: 6 },
  metricIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: c.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: { fontFamily: fonts.bold, fontSize: 26 },
  barTrack: { height: 8, backgroundColor: '#EAEAEA', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: c.red, borderRadius: 4 },
});
