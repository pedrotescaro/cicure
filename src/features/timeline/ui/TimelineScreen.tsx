import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useStore } from '../../../data/store';
import { Badge, Empty, IconButton, Pills, Txt, safeBack, s } from '../../../ui/components';
import { fonts, useTheme } from '../../../ui/theme';
import { dateLabel } from '../../../domain/clinical';
import { buildTimeline, filterTimeline } from '../domain/timeline.service';
import type { TimelineEvent, TimelineEventType } from '../domain/types';

const CATEGORY_OPTIONS = [
  'Todos',
  'Atendimentos',
  'Feridas',
  'Mensurações',
  'Fotografias',
  'Escalas',
  'Curativos',
  'Desfechos'
];

const CATEGORY_MAP: Record<string, TimelineEventType | 'todos'> = {
  'Todos': 'todos',
  'Atendimentos': 'atendimento',
  'Feridas': 'ferida_nova',
  'Mensurações': 'mensuracao',
  'Fotografias': 'fotografia',
  'Escalas': 'escala',
  'Curativos': 'produto',
  'Desfechos': 'cicatrizacao'
};

export default function TimelineScreen({ patientId, initialWoundId = '' }: { patientId: string; initialWoundId?: string }) {
  const router = useRouter();
  const { colors: c } = useTheme();
  const [selectedPill, setSelectedPill] = useState('Todos');
  const [selectedWound, setSelectedWound] = useState(initialWoundId);
  const presentation = useStore(state => state.presentation);

  const patient = useStore(st => st.data.patients.find(p => p.id === patientId));
  const wounds = useStore(st => st.data.wounds.filter(w => w.patientId === patientId));
  const visits = useStore(st => st.data.visits.filter(v => v.patientId === patientId));
  const reports = useStore(st => st.data.reports.filter(r => r.patientId === patientId));

  const allEvents = useMemo(() => {
    if (!patient) return [];
    const chosenWounds = selectedWound ? wounds.filter(wound => wound.id === selectedWound) : wounds;
    const chosenVisits = selectedWound ? visits.filter(visit => visit.woundId === selectedWound) : visits;
    const chosenReports = selectedWound ? reports.filter(report => chosenVisits.some(visit => visit.id === report.visitId)) : reports;
    return buildTimeline(patient, chosenWounds, chosenVisits, chosenReports);
  }, [patient, wounds, visits, reports, selectedWound]);

  const filteredEvents = useMemo(() => {
    const filterCat = CATEGORY_MAP[selectedPill] || 'todos';
    return filterTimeline(allEvents, { category: filterCat });
  }, [allEvents, selectedPill]);

  if (presentation || !patient) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Empty
          title={presentation ? 'Identificação protegida' : 'Paciente não encontrado'}
          description={presentation ? 'Desative o modo apresentação no Menu para consultar o histórico.' : 'Volte à lista para selecionar um paciente.'}
          action="Voltar"
          onPress={() => safeBack(router, '/patients')}
        />
      </View>
    );
  }

  const renderEventItem = ({ item }: { item: TimelineEvent }) => {
    const dateFormatted = dateLabel(item.date, 'dd/MM/yyyy');
    const timeFormatted = item.date.includes('T') ? item.date.split('T')[1].slice(0, 5) : '';

    return (
      <View style={styles.eventRow}>
        {/* Coluna da Data */}
        <View style={styles.dateCol}>
          <Txt style={styles.eventDate}>{dateFormatted.slice(0, 5)}</Txt>
          <Txt muted style={styles.eventYear}>{dateFormatted.slice(6)}</Txt>
          {timeFormatted ? <Txt muted style={styles.eventTime}>{timeFormatted}</Txt> : null}
        </View>

        {/* Linha e Ponto do Timeline */}
        <View style={styles.timelineCol}>
          <View style={[
            styles.timelineDot,
            { backgroundColor: c.dark, borderColor: c.bg },
            item.badgeTone === 'green' && { backgroundColor: c.green, borderColor: c.greenSoft },
            item.badgeTone === 'amber' && { backgroundColor: c.amber, borderColor: c.amberSoft },
            item.badgeTone === 'red' && { backgroundColor: c.red, borderColor: c.redSoft },
          ]} />
          <View style={[styles.timelineLine, { backgroundColor: c.border }]} />
        </View>

        {/* Card do Evento */}
        <View style={styles.contentCol}>
          <Pressable
            accessibilityRole={item.referenceKind === 'visits' || item.referenceKind === 'reports' ? 'button' : undefined}
            onPress={() => {
              if (item.referenceKind === 'visits') {
                router.push(`/care/${item.referenceId}` as never);
              } else if (item.referenceKind === 'reports') {
                router.push('/reports');
              }
            }}
            style={({ pressed }) => [
              styles.eventCard,
              { backgroundColor: c.surface, borderColor: c.border },
              pressed && { opacity: 0.85 }
            ]}
          >
            <View style={s.between}>
              <Badge tone={item.badgeTone || 'neutral'}>{item.category}</Badge>
              <Txt muted style={{ fontSize: 14, flexShrink: 1 }}>{item.professionalName}</Txt>
            </View>
            <Txt style={styles.eventTitle}>{item.title}</Txt>
            <Txt muted style={styles.eventSummary}>{item.summary}</Txt>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <IconButton icon={ChevronLeft} label="Voltar" onPress={() => safeBack(router, patientId ? `/patient/${patientId}` : '/patients')} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={styles.headerTitle}>Histórico e evolução</Txt>
          <Txt muted>{patient.name} · {allEvents.length} registros</Txt>
        </View>
      </View>

      {/* Filtros em Pills */}
      <View style={[styles.filterBar, { borderBottomColor: c.border }]}>
        <Pills options={['Todas as feridas', ...wounds.map((wound, index) => `${index + 1}. ${wound.location}`)]} value={selectedWound ? `${wounds.findIndex(wound => wound.id === selectedWound) + 1}. ${wounds.find(wound => wound.id === selectedWound)?.location}` : 'Todas as feridas'} onChange={value => setSelectedWound(value === 'Todas as feridas' ? '' : wounds[Number(value.split('.')[0]) - 1]?.id || '')} />
        <Pills
          options={CATEGORY_OPTIONS}
          value={selectedPill}
          onChange={setSelectedPill}
        />
      </View>

      {/* Lista de Eventos */}
      {filteredEvents.length === 0 ? (
        <Empty
          title="Nenhum evento nesta categoria"
          description="Alterne o filtro ou realize novos registros para este paciente."
          action="Ver todos"
          onPress={() => setSelectedPill('Todos')}
        />
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={item => item.id}
          renderItem={renderEventItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: fonts.brand, fontSize: 22 },
  filterBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, gap: 12 },
  listContent: { padding: 16, paddingBottom: 100 },
  eventRow: { flexDirection: 'row', marginBottom: 12 },
  dateCol: { width: 56, alignItems: 'flex-end', paddingTop: 8, paddingRight: 10 },
  eventDate: { fontFamily: fonts.semibold, fontSize: 14 },
  eventYear: { fontSize: 14 },
  eventTime: { fontSize: 14, marginTop: 2 },
  timelineCol: { width: 24, alignItems: 'center' },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    marginTop: 10,
    zIndex: 2,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    marginTop: -2,
  },
  contentCol: { flex: 1, paddingLeft: 6 },
  eventCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  eventTitle: { fontFamily: fonts.semibold, fontSize: 16 },
  eventSummary: { fontSize: 16 },
});
