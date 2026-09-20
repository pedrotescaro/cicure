import { useTabContentInset } from '../../src/ui/navigation/useTabContentInset';
import { useEffect, useState, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { addDays, format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  AlarmClock, 
  ChevronRight, 
  HeartPulse, 
  Play, 
  RotateCcw, 
  Settings2, 
  Search, 
  AlertCircle, 
  BarChart3, 
  Package, 
  Building2, 
  Sparkles,
  Cloud
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { Avatar, Badge, Button, Card, Divider, IconButton, Label, SectionTitle, Txt, s } from '../../src/ui/components';
import { colors as c, fonts } from '../../src/ui/theme';
import { useStore } from '../../src/data/store';
import { area, dateLabel, number } from '../../src/domain/clinical';
import type { Visit } from '../../src/domain/types';
import { useRouter } from 'expo-router';
import { computePendingItems } from '../../src/features/pending/domain/pending.service';
import { GlobalSearchModal } from '../../src/features/search/ui/GlobalSearchModal';
import { PendingNotification } from '../../src/features/pending/ui/PendingNotification';

function Topbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const router = useRouter();
  return (
    <View style={styles.topbar}>
      <Txt style={styles.brand}>cicure</Txt>
      <View style={styles.topbarActions}>
        <IconButton icon={Search} label="Busca Global" onPress={onOpenSearch} style={styles.topbarBtn} />
        <IconButton icon={Building2} label="Clínica / Workspace" onPress={() => router.push('/organization' as never)} style={styles.topbarBtn} />
      </View>
    </View>
  );
}

function Greeting() {
  const profile = useStore(st => st.data.profiles[0]);
  const presentation = useStore(st => st.presentation);

  return (
    <View style={styles.greeting}>
      <Txt muted style={{ fontSize: 13 }}>
        {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
      </Txt>
      <Txt style={[s.h1, { marginTop: 2 }]}>
        Olá, <Txt style={{ color: c.red, fontFamily: fonts.brand, fontSize: 30 }}>
          {presentation ? 'profissional' : profile?.name.split(' ')[0] ?? 'profissional'}
        </Txt>
      </Txt>
      <Txt muted style={{ marginTop: 2 }}>Vamos cuidar da evolução de hoje?</Txt>
    </View>
  );
}

function WeekStrip() {
  const [selected, setSelected] = useState(new Date());
  return (
    <View style={styles.week}>
      {Array.from({ length: 7 }).map((_, i) => {
        const date = addDays(new Date(), i - 2);
        const active = format(date, 'yyyy-MM-dd') === format(selected, 'yyyy-MM-dd');
        return (
          <Pressable key={i} onPress={() => setSelected(date)} style={styles.day}>
            <Txt muted style={{ fontSize: 10, textTransform: 'uppercase' }}>
              {format(date, 'EEE', { locale: ptBR }).replace('.', '')}
            </Txt>
            <View style={[styles.dayCircle, active && { backgroundColor: c.dark }]}>
              <Txt style={{ fontFamily: fonts.semibold, color: active ? '#FFF' : c.text }}>
                {format(date, 'd')}
              </Txt>
            </View>
            {isToday(date) && <View style={styles.todayDot} />}
          </Pressable>
        );
      })}
    </View>
  );
}

function Sparkline() {
  return (
    <Svg width="100%" height={75} viewBox="0 0 238 75">
      <Path d="M0 62 C30 55,65 66,102 44 S170 40,238 12 L238 75 L0 75 Z" fill={c.redSoft} />
      <Path d="M0 62 C30 55,65 66,102 44 S170 40,238 12" fill="none" stroke={c.red} strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  );
}

function TodayCard({ visits }: { visits: Visit[] }) {
  const router = useRouter();
  const patients = useStore(st => st.data.patients);
  const wounds = useStore(st => st.data.wounds);
  const today = visits.filter(v => v.state === 'Agendado' && isToday(parseISO(v.date)));

  return (
    <Card dark style={{ padding: 24, gap: 18 }}>
      <View style={s.between}>
        <View style={{ gap: 4 }}>
          <Label style={{ color: '#A8A8A8' }}>HOJE · {format(new Date(), 'dd/MM')}</Label>
          <Txt style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 20 }}>
            {today.length} atendimentos
          </Txt>
        </View>
        <View style={styles.darkCounter}>
          <Txt style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 22 }}>{today.length}</Txt>
          <Txt style={{ color: '#BDBDBD', fontSize: 10 }}>PENDENTES</Txt>
        </View>
      </View>

      {today.length === 0 ? (
        <Txt style={{ color: '#BABABA' }}>Nenhum atendimento agendado para hoje.</Txt>
      ) : (
        today.slice(0, 3).map(visit => {
          const patient = patients.find(p => p.id === visit.patientId);
          const wound = wounds.find(w => w.id === visit.woundId);
          if (!patient || !wound) return null;
          return (
            <Pressable key={visit.id} onPress={() => router.push(`/care/${visit.id}` as never)} style={styles.darkRow}>
              <View style={styles.time}>
                <Txt style={{ color: '#FFF', fontFamily: fonts.semibold }}>{visit.scheduledTime || '09:00'}</Txt>
                <View style={styles.timeline} />
              </View>
              <Avatar name={patient.name} color={patient.color} size={40} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt style={{ color: '#FFF', fontFamily: fonts.semibold }}>{patient.name}</Txt>
                <Txt style={{ color: '#A9A9A9', fontSize: 12 }}>{wound.location} · {wound.etiology}</Txt>
              </View>
              <ChevronRight size={18} color="#8C8C8C" />
            </Pressable>
          );
        })
      )}
    </Card>
  );
}

function QuickHub() {
  const router = useRouter();
  const hubItems = [
    { label: 'Indicadores', icon: BarChart3, route: '/indicators' },
    { label: 'Estoque & Lotes', icon: Package, route: '/inventory' },
    { label: 'Templates', icon: Sparkles, route: '/templates' },
    { label: 'Sync Offline', icon: Cloud, route: '/sync' },
  ];

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.hubScroll}
    >
      {hubItems.map((item, i) => {
        const Icon = item.icon;
        return (
          <Pressable 
            key={i} 
            onPress={() => router.push(item.route as never)} 
            style={({ pressed }) => [styles.hubChip, pressed && { opacity: 0.75 }]}
          >
            <View style={styles.hubChipIcon}>
              <Icon size={14} color={c.red} />
            </View>
            <Txt style={styles.hubChipText}>{item.label}</Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function FollowUp() {
  const visits = useStore(st => st.data.visits);
  const patients = useStore(st => st.data.patients);
  const wounds = useStore(st => st.data.wounds);
  const router = useRouter();

  const completed = visits.filter(v => v.state === 'Concluído');
  const avg = completed.length ? completed.reduce((sum, v) => sum + area(v), 0) / completed.length : 0;

  return (
    <Card style={{ padding: 18, gap: 14 }}>
      <View style={s.between}>
        <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          <Label>ACOMPANHAMENTO LONGITUDINAL</Label>
          <Txt style={{ fontFamily: fonts.semibold, fontSize: 17, marginTop: 2 }} numberOfLines={1}>
            Evolução dos Pacientes
          </Txt>
        </View>
        <Pressable 
          onPress={() => router.push('/indicators' as never)}
          hitSlop={8}
          style={styles.indicatorLink}
        >
          <Txt style={styles.indicatorLinkText}>Indicadores</Txt>
          <ChevronRight size={13} color={c.red} />
        </Pressable>
      </View>

      <View style={{ height: 76 }}>
        <Sparkline />
      </View>

      <View style={styles.metrics}>
        <View>
          <Txt style={styles.metricNumber}>{patients.length}</Txt>
          <Label>ATIVOS</Label>
        </View>
        <View>
          <Txt style={[styles.metricNumber, { color: c.green }]}>
            {wounds.filter(w => w.status === 'Em cicatrização').length}
          </Txt>
          <Label>CICATRIZANDO</Label>
        </View>
        <View>
          <Txt style={[styles.metricNumber, { color: c.amber }]}>
            {wounds.filter(w => w.status === 'Estagnada').length}
          </Txt>
          <Label>ESTAGNADAS</Label>
        </View>
      </View>

      <Txt muted style={{ fontSize: 12 }}>
        Área média registrada: <Txt style={{ fontFamily: fonts.semibold }}>{number(avg)} cm²</Txt>
      </Txt>
    </Card>
  );
}

function QuickTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds(v => v + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  return (
    <Card style={{ padding: 20, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Label>CRONÔMETRO RÁPIDO</Label>
        <Txt style={{ fontFamily: fonts.semibold, fontSize: 17 }}>Tempo de contato</Txt>
        <Txt muted style={{ fontSize: 12 }}>Para fotobiomodulação ou curativos.</Txt>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Txt style={{ fontFamily: fonts.bold, fontSize: 24, letterSpacing: 1 }}>
          {`${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <IconButton label="Zerar" icon={RotateCcw} onPress={() => { setSeconds(0); setRunning(false); }} />
          <IconButton label={running ? 'Pausar' : 'Iniciar'} icon={running ? AlarmClock : Play} color={c.red} onPress={() => setRunning(v => !v)} />
        </View>
      </View>
    </Card>
  );
}

export default function Home() {
  const bottomInset = useTabContentInset();
  const { width } = useWindowDimensions();
  const store = useStore();
  const visits = store.data.visits;
  const pendingSync = store.pending;
  const syncState = store.syncState;
  const init = store.init;
  const error = store.error;
  const router = useRouter();

  const [searchVisible, setSearchVisible] = useState(false);

  // Calcula pendências clínicas
  const pendingItems = useMemo(() => computePendingItems(store.data, pendingSync), [store.data, pendingSync]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView 
        contentContainerStyle={[
          styles.content, 
          { paddingHorizontal: width < 380 ? 16 : 20, paddingBottom: bottomInset }
        ]}
        refreshControl={<RefreshControl refreshing={syncState === 'syncing'} onRefresh={() => init()} tintColor={c.red} />}
        showsVerticalScrollIndicator={false}
      >
        <Topbar onOpenSearch={() => setSearchVisible(true)} />

        <Greeting />

        <WeekStrip />

        {/* Notificação & Popup de Pendências */}
        <PendingNotification items={pendingItems} />

        {/* Hub de Acesso Rápido aos Novos Módulos */}
        <QuickHub />


        <TodayCard visits={visits} />

        <FollowUp />

        <QuickTimer />
      </ScrollView>

      {/* Modal de Busca Global (§22) */}
      <GlobalSearchModal 
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 18, paddingBottom: 160, gap: 18 },
  topbar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: c.red, fontFamily: fonts.brand, fontSize: 26, letterSpacing: -0.8 },
  topbarActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topbarBtn: { width: 42, height: 42, borderRadius: 21 },
  greeting: { gap: 2 },
  week: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  day: { alignItems: 'center', gap: 6, minWidth: 36 },
  dayCircle: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.red },
  darkCounter: { alignItems: 'flex-end', gap: 1 },
  darkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  time: { width: 44, alignItems: 'center', gap: 4 },
  timeline: { height: 20, width: 1, backgroundColor: '#505050' },
  metrics: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: c.border, paddingTop: 14, gap: 8 },
  metricNumber: { fontFamily: fonts.semibold, fontSize: 20, marginBottom: 3 },
  indicatorLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.redSoft,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  indicatorLinkText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: c.red,
  },
  hubScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  hubChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  hubChipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubChipText: {
    fontSize: 12.5,
    fontFamily: fonts.medium,
    color: c.text,
  },
});
