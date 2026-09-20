import { useTabContentInset } from '../../../ui/navigation/useTabContentInset';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Plus, 
  Clock, 
  AlertCircle, 
  Bell, 
  CheckCircle2, 
  CalendarDays,
  ChevronRight,
  Play
} from 'lucide-react-native';
import { Avatar, Badge, Button, Card, Empty, IconButton, Label, Pills, SectionTitle, Txt, s } from '../../../ui/components';
import { fonts, useTheme } from '../../../ui/theme';
import { useStore } from '../../../data/store';
import { dateLabel } from '../../../domain/clinical';
import type { Visit } from '../../../domain/types';

export default function AdvancedAgenda() {
  const bottomInset = useTabContentInset();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { visits, patients, wounds } = useStore(st => st.data);
  const { colors, isDark } = useTheme();

  const [viewMode, setViewMode] = useState<'Diária' | 'Semanal' | 'Mensal'>('Diária');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const todayStr = new Date().toISOString().slice(0, 10);
  const isNarrow = width < 380;

  // 1. Pacientes sem retorno
  const patientsWithoutReturn = useMemo(() => {
    return patients.filter(patient => {
      if (patient.status !== 'Ativo') return false;
      const patientVisits = visits
        .filter(v => v.patientId === patient.id && v.state === 'Concluído')
        .sort((a, b) => b.date.localeCompare(a.date));

      if (patientVisits.length === 0) return false;
      const latest = patientVisits[0];

      if (latest.returnDate && latest.returnDate < todayStr) return true;
      const daysSince = (Date.now() - Date.parse(latest.date)) / 86400000;
      return daysSince > 14;
    });
  }, [patients, visits, todayStr]);

  // 2. Visitas filtradas por status e modo
  const filteredVisits = useMemo(() => {
    return visits.filter(v => {
      if (statusFilter === 'Agendados' && v.state !== 'Agendado') return false;
      if (statusFilter === 'Concluídos' && v.state !== 'Concluído') return false;
      if (statusFilter === 'Atrasados') {
        const isLate = v.state === 'Agendado' && v.date.slice(0, 10) < todayStr;
        if (!isLate) return false;
      }
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [visits, statusFilter, todayStr]);

  const handleSetReminder = (v: Visit, patientName: string) => {
    Alert.alert(
      'Lembrete Configurado',
      `Lembrete local agendado para o atendimento de ${patientName} às ${v.scheduledTime || '09:00'}.`
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView 
        contentContainerStyle={[
          styles.content, 
          { paddingHorizontal: isNarrow ? 16 : 20, paddingBottom: bottomInset }
        ]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Topbar Padronizada */}
        <View style={styles.topbar}>
          <Txt style={[styles.brand, { color: colors.red }]}>cicure</Txt>
          <View style={s.row}>
            <IconButton 
              icon={Plus} 
              label="Novo atendimento" 
              color={colors.red} 
              onPress={() => router.push('/care/new')} 
            />
          </View>
        </View>

        {/* Título Padronizado */}
        <View style={{ gap: 2 }}>
          <Txt muted style={styles.sectionLabel}>GESTÃO CLÍNICA</Txt>
          <Txt style={s.h1}>Atendimento</Txt>
        </View>

        {/* Seletor de Modo de Visualização */}
        <Pills 
          options={['Diária', 'Semanal', 'Mensal']} 
          value={viewMode} 
          onChange={v => setViewMode(v as any)} 
        />

        {/* Filtros de Status */}
        <Pills 
          options={['Todos', 'Agendados', 'Concluídos', 'Atrasados']} 
          value={statusFilter} 
          onChange={setStatusFilter} 
        />

        {/* SEÇÃO RESPONSIVA: PACIENTES SEM RETORNO */}
        {patientsWithoutReturn.length > 0 && (
          <Card 
            style={[
              styles.withoutReturnCard,
              isDark 
                ? { backgroundColor: 'rgba(255, 77, 77, 0.08)', borderColor: 'rgba(255, 77, 77, 0.25)' }
                : { backgroundColor: '#FFF8F8', borderColor: '#F5C6C6' }
            ]}
          >
            <View style={[s.between, { flexWrap: 'wrap', gap: 8 }]}>
              <View style={[s.row, { flex: 1, minWidth: isNarrow ? 160 : 200 }]}>
                <AlertCircle size={20} color={colors.red} />
                <Txt style={[styles.withoutReturnTitle, { flex: 1, color: colors.red }]} numberOfLines={1}>
                  Pacientes sem Retorno ({patientsWithoutReturn.length})
                </Txt>
              </View>
              <Badge tone="red">Atrasados</Badge>
            </View>

            <Txt muted style={{ fontSize: 12, lineHeight: 17 }}>
              Pacientes com tratamento ativo cujo intervalo de acompanhamento ou data de retorno prevista expirou.
            </Txt>

            <View style={{ gap: 8, marginTop: 4 }}>
              {patientsWithoutReturn.map(p => {
                const patientWound = wounds.find(w => w.patientId === p.id);
                return (
                  <Pressable 
                    key={p.id}
                    onPress={() => router.push(`/patient/${p.id}` as never)}
                    style={[
                      styles.withoutReturnItem,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      }
                    ]}
                  >
                    <Avatar name={p.name} color={p.color} size={36} />
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Txt style={{ fontFamily: fonts.semibold, fontSize: 14 }} numberOfLines={1}>{p.name}</Txt>
                      <Txt muted style={{ fontSize: 12 }} numberOfLines={1}>
                        {patientWound?.location || 'Lesão em acompanhamento'}
                      </Txt>
                    </View>
                    <Button 
                      title="Agendar" 
                      small 
                      variant="outline" 
                      onPress={() => router.push(`/care/new?patientId=${p.id}` as never)}
                      style={{ paddingHorizontal: 12, minHeight: 36 }}
                    />
                  </Pressable>
                );
              })}
            </View>
          </Card>
        )}

        {/* Lista de Atendimentos */}
        <View style={{ gap: 12 }}>
          <SectionTitle title={`ATENDIMENTOS (${filteredVisits.length})`} />

          {filteredVisits.map(v => {
            const p = patients.find(x => x.id === v.patientId);
            const w = wounds.find(x => x.id === v.woundId);
            if (!p || !w) return null;

            const isCompleted = v.state === 'Concluído';
            const isLate = !isCompleted && v.date.slice(0, 10) < todayStr;

            return (
              <Card key={v.id} style={styles.visitCard}>
                <Pressable 
                  onPress={() => router.push(`/care/${v.id}` as never)}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <Avatar name={p.name} color={p.color} size={44} />
                  <View style={{ flex: 1, minWidth: 0, marginLeft: 12, gap: 4 }}>
                    <View style={s.between}>
                      <Txt style={{ fontFamily: fonts.semibold, fontSize: 15, flex: 1 }} numberOfLines={1}>
                        {p.name}
                      </Txt>
                      <Badge tone={isCompleted ? 'green' : isLate ? 'red' : 'amber'}>
                        {isCompleted ? 'Concluído' : isLate ? 'Atrasado' : 'Agendado'}
                      </Badge>
                    </View>

                    <Txt muted style={{ fontSize: 12 }} numberOfLines={1}>
                      {v.scheduledTime || '09:00'} · {dateLabel(v.date)} · {w.location}
                    </Txt>
                    <Txt muted style={{ fontSize: 11 }} numberOfLines={1}>Etiologia: {w.etiology}</Txt>
                  </View>
                </Pressable>

                {!isCompleted && (
                  <View style={[
                    styles.visitActions, 
                    { 
                      borderTopColor: colors.border,
                      flexDirection: isNarrow ? 'column' : 'row'
                    }
                  ]}>
                    <Button 
                      title="Lembrete" 
                      variant="outline" 
                      icon={Bell} 
                      small 
                      onPress={() => handleSetReminder(v, p.name)}
                      style={{ flex: 1, minWidth: isNarrow ? '100%' : 100 }}
                    />
                    <Button 
                      title="Iniciar" 
                      variant="primary" 
                      icon={Play}
                      small 
                      onPress={() => router.push(`/care/new?visitId=${v.id}` as never)}
                      style={{ flex: isNarrow ? 1 : 1.2, minWidth: isNarrow ? '100%' : 110 }}
                    />
                  </View>
                )}
              </Card>
            );
          })}

          {filteredVisits.length === 0 && (
            <Card>
              <Empty 
                icon={CalendarDays} 
                title="Nenhum atendimento neste filtro" 
                description="Agende ou inicie um atendimento para cuidar da evolução dos pacientes."
                action="Novo Atendimento"
                onPress={() => router.push('/care/new')}
              />
            </Card>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { 
    paddingTop: 18, 
    paddingBottom: 160, 
    gap: 18, 
    width: '100%', 
    maxWidth: 840, 
    alignSelf: 'center' 
  },
  topbar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontFamily: fonts.brand, fontSize: 26, letterSpacing: -0.8 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.4, fontFamily: fonts.semibold },
  withoutReturnCard: {
    gap: 10,
    padding: 16,
  },
  withoutReturnTitle: { fontFamily: fonts.semibold, fontSize: 15 },
  withoutReturnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  visitCard: { gap: 12, padding: 16 },
  visitActions: {
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 10,
  },
});
