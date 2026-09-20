import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ChevronLeft, 
  Clock, 
  Filter, 
  Stethoscope, 
  Camera, 
  Sparkles, 
  Pill, 
  FileText, 
  CheckCircle2, 
  Calendar 
} from 'lucide-react-native';
import { useStore } from '../../../data/store';
import { Badge, Card, Empty, IconButton, Label, Pills, Txt, s } from '../../../ui/components';
import { colors as c, fonts } from '../../../ui/theme';
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

export default function TimelineScreen({ patientId }: { patientId: string }) {
  const router = useRouter();
  const store = useStore();
  const [selectedPill, setSelectedPill] = useState('Todos');

  const patient = useStore(st => st.data.patients.find(p => p.id === patientId));
  const wounds = useStore(st => st.data.wounds.filter(w => w.patientId === patientId));
  const visits = useStore(st => st.data.visits.filter(v => v.patientId === patientId));
  const reports = useStore(st => st.data.reports.filter(r => r.patientId === patientId));

  const allEvents = useMemo(() => {
    if (!patient) return [];
    return buildTimeline(patient, wounds, visits, reports);
  }, [patient, wounds, visits, reports]);

  const filteredEvents = useMemo(() => {
    const filterCat = CATEGORY_MAP[selectedPill] || 'todos';
    return filterTimeline(allEvents, { category: filterCat });
  }, [allEvents, selectedPill]);

  if (!patient) {
    return (
      <View style={styles.center}>
        <Empty 
          title="Paciente não encontrado" 
          description="Verifique o identificador e tente novamente."
          action="Voltar"
          onPress={() => router.back()}
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
            item.badgeTone === 'green' && { backgroundColor: c.green, borderColor: c.greenSoft },
            item.badgeTone === 'amber' && { backgroundColor: c.amber, borderColor: c.amberSoft },
            item.badgeTone === 'red' && { backgroundColor: c.red, borderColor: c.redSoft },
          ]} />
          <View style={styles.timelineLine} />
        </View>

        {/* Card do Evento */}
        <View style={styles.contentCol}>
          <Pressable 
            onPress={() => {
              if (item.referenceKind === 'visits') {
                router.push(`/care/${item.referenceId}` as never);
              }
            }}
            style={({ pressed }) => [styles.eventCard, pressed && { opacity: 0.85 }]}
          >
            <View style={s.between}>
              <Badge tone={item.badgeTone || 'neutral'}>{item.category}</Badge>
              <Txt muted style={{ fontSize: 11 }}>{item.professionalName}</Txt>
            </View>
            <Txt style={styles.eventTitle}>{item.title}</Txt>
            <Txt muted style={styles.eventSummary}>{item.summary}</Txt>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Voltar" onPress={() => router.back()} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={styles.headerTitle}>Linha do Tempo</Txt>
          <Txt muted style={{ fontSize: 13 }}>{patient.name} · {allEvents.length} eventos registrados</Txt>
        </View>
      </View>

      {/* Filtros em Pills */}
      <View style={styles.filterBar}>
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
  container: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg },
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
  headerTitle: { fontFamily: fonts.brand, fontSize: 22, color: c.text },
  filterBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  listContent: { padding: 16, paddingBottom: 100 },
  eventRow: { flexDirection: 'row', marginBottom: 12 },
  dateCol: { width: 56, alignItems: 'flex-end', paddingTop: 8, paddingRight: 10 },
  eventDate: { fontFamily: fonts.semibold, fontSize: 14, color: c.text },
  eventYear: { fontSize: 11 },
  eventTime: { fontSize: 10, marginTop: 2 },
  timelineCol: { width: 24, alignItems: 'center' },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: c.dark,
    borderWidth: 2,
    borderColor: '#FFF',
    marginTop: 10,
    zIndex: 2,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: c.border,
    marginTop: -2,
  },
  contentCol: { flex: 1, paddingLeft: 6 },
  eventCard: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  eventTitle: { fontFamily: fonts.semibold, fontSize: 15, color: c.text },
  eventSummary: { fontSize: 13, lineHeight: 18, color: c.secondary },
});
