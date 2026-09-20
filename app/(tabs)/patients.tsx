import { useTabContentInset } from '../../src/ui/navigation/useTabContentInset';
import React, { useMemo, useState } from 'react';
import { 
  Alert, 
  Modal, 
  Platform,
  Pressable, 
  ScrollView, 
  StyleSheet, 
  TextInput, 
  View, 
  useWindowDimensions 
} from 'react-native';
import { addDays, format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowLeft, 
  ArrowRight, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  SlidersHorizontal, 
  TrendingDown, 
  TrendingUp, 
  UserRoundPlus, 
  Minus,
  X,
  Check,
  UserPlus
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Avatar, Badge, Button, Card, Choices, Empty, Field, IconButton, Label, Pills, SectionTitle, Txt, s } from '../../src/ui/components';
import { colors as c, fonts, useTheme } from '../../src/ui/theme';
import { useStore, uid } from '../../src/data/store';
import { dateLabel } from '../../src/domain/clinical';
import type { Patient, Wound } from '../../src/domain/types';

const filters = ['Todos', 'Ativos', 'Alta', 'Arquivados'];
const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function MonthStrip() {
  const { colors: c, isDark } = useTheme();
  const [selected, setSelected] = useState(new Date());
  const start = addDays(selected, -3);
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.monthHeader}>
        <IconButton icon={ArrowLeft} label="Mês anterior" onPress={() => setSelected(addDays(selected, -7))} />
        <Txt style={{ fontFamily: fonts.semibold, fontSize: 16 }}>
          {format(selected, "MMMM / yyyy", { locale: ptBR }).replace(/^./, letter => letter.toUpperCase())}
        </Txt>
        <IconButton icon={ArrowRight} label="Próximo mês" onPress={() => setSelected(addDays(selected, 7))} />
      </View>
      <View style={styles.calendarRow}>
        {Array.from({ length: 7 }).map((_, index) => {
          const date = addDays(start, index);
          const active = format(date, 'yyyy-MM-dd') === format(selected, 'yyyy-MM-dd');
          return (
            <Pressable key={index} onPress={() => setSelected(date)} style={styles.calendarDay}>
              <Txt muted style={{ fontSize: 11, fontFamily: fonts.medium }}>{weekdays[index]}</Txt>
              <View style={[styles.dateCircle, { borderColor: c.border }, active && { backgroundColor: isDark ? '#2E2E34' : c.dark, borderColor: isDark ? '#4A4A52' : c.dark }]}>
                <Txt style={{ color: active ? '#FFF' : c.text, fontFamily: fonts.medium, fontSize: 13 }}>
                  {format(date, 'd')}
                </Txt>
              </View>
              {isToday(date) && <View style={[styles.todayDot, { backgroundColor: c.red }]} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function Patients() {
  const bottomInset = useTabContentInset();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors: c, isDark } = useTheme();
  const store = useStore();
  const { patients, wounds, visits } = store.data;
  const presentation = store.presentation;

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHovered, setSearchHovered] = useState(false);

  // Form states para Adicionar Paciente
  const [newName, setNewName] = useState('');
  const [newBirth, setNewBirth] = useState('');
  const [newSex, setNewSex] = useState<'Feminino' | 'Masculino'>('Feminino');
  const [newCpf, setNewCpf] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newAllergies, setNewAllergies] = useState('');
  const [newComorbidity, setNewComorbidity] = useState('');
  const [newWoundLocation, setNewWoundLocation] = useState('');
  const [newWoundEtiology, setNewWoundEtiology] = useState('Úlcera venosa');
  const [savingPatient, setSavingPatient] = useState(false);

  const todayIds = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return new Set(
      visits
        .filter(v => v.state === 'Agendado' && v.date.slice(0, 10) === todayStr)
        .map(v => v.patientId)
    );
  }, [visits]);

  const filtered = useMemo(() => {
    return patients
      .filter(p => (filter === 'Todos' || p.status === filter) && p.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => Number(todayIds.has(b.id)) - Number(todayIds.has(a.id)));
  }, [patients, query, filter, todayIds]);

  const handleSavePatient = async () => {
    if (!newName.trim()) {
      Alert.alert('Nome Obrigatório', 'Por favor, informe o nome completo do paciente.');
      return;
    }

    setSavingPatient(true);
    try {
      const patientId = uid();
      const woundId = uid();
      const randomColor = ['#FAD2D2', '#FCE3E3', '#FCE9E5', '#F9D8D6', '#E8F5EF', '#FFF4E0'][Math.floor(Math.random() * 6)];

      const newPatient: Patient = {
        id: patientId,
        name: newName.trim(),
        birthDate: newBirth.trim() || '1965-05-15',
        sex: newSex,
        cpf: newCpf.trim() || '',
        sus: '',
        phone: newPhone.trim() || '',
        emergency: '',
        address: newAddress.trim() || 'Não informado',
        status: 'Ativo',
        weight: 70,
        height: 165,
        bloodType: 'O+',
        allergies: newAllergies.trim() ? newAllergies.split(',').map(a => a.trim()) : [],
        smoking: 'Não',
        alcohol: 'Não',
        activity: 'Sedentário',
        comorbidities: newComorbidity.trim() ? [{ name: newComorbidity.trim(), date: '2024-01-01', note: '' }] : [],
        medications: [],
        exams: [],
        color: randomColor,
        createdAt: new Date().toISOString()
      };

      const newWound: Wound = {
        id: woundId,
        patientId,
        location: newWoundLocation.trim() || 'Membro inferior direito',
        etiology: newWoundEtiology,
        startDate: new Date().toISOString().slice(0, 10),
        status: 'Em cicatrização',
        previousTreatments: 'Nenhum',
        pin: { x: 90, y: 220, side: 'Frente' }
      };

      // Salva no SQLite local e store
      await store.save('patients', newPatient);
      await store.save('wounds', newWound);

      // Limpa formulário
      setNewName('');
      setNewBirth('');
      setNewCpf('');
      setNewPhone('');
      setNewAddress('');
      setNewAllergies('');
      setNewComorbidity('');
      setNewWoundLocation('');
      setAddModalVisible(false);

      Alert.alert(
        'Paciente Cadastrado!',
        `${newPatient.name} foi adicionado com sucesso ao prontuário clínico.`,
        [
          { 
            text: 'Ver Prontuário', 
            onPress: () => router.push(`/patient/${patientId}` as never) 
          },
          { text: 'OK' }
        ]
      );
    } catch {
      Alert.alert('Erro ao Salvar', 'Não foi possível registrar o paciente. Tente novamente.');
    } finally {
      setSavingPatient(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView 
        contentContainerStyle={[
          styles.content, 
          { paddingHorizontal: width < 380 ? 16 : 20, paddingBottom: bottomInset }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Topbar */}
        <View style={styles.topbar}>
          <Txt style={[styles.brand, { color: c.red }]}>cicure</Txt>
          <View style={s.row}>
            <IconButton 
              icon={UserRoundPlus} 
              label="Adicionar paciente" 
              color={c.red} 
              onPress={() => setAddModalVisible(true)} 
            />
          </View>
        </View>

        <Txt style={s.h1}>Pacientes</Txt>

        <MonthStrip />

        <Pills options={filters} value={filter} onChange={setFilter} />

        {/* Busca com foco e hover refinados */}
        <View 
          // @ts-expect-error web hover prop
          onMouseEnter={() => setSearchHovered(true)}
          onMouseLeave={() => setSearchHovered(false)}
          style={[
            styles.search, 
            { backgroundColor: isDark ? '#202024' : '#FFF', borderColor: c.border },
            searchHovered && !searchFocused && { borderColor: isDark ? '#4F4F56' : '#AEAEAE' },
            searchFocused && { borderColor: c.red }
          ]}
        >
          <Search size={18} color={searchFocused ? c.red : searchHovered ? c.text : c.tertiary} />
          <TextInput 
            accessibilityLabel="Buscar paciente" 
            value={query} 
            onChangeText={setQuery} 
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Buscar paciente pelo nome..." 
            placeholderTextColor={c.tertiary} 
            style={[styles.searchInput, { color: c.text }]} 
          />
          {query ? (
            <IconButton icon={X} label="Limpar" onPress={() => setQuery('')} style={{ width: 32, height: 32 }} />
          ) : null}
        </View>

        {/* Seção Data */}
        <View style={{ gap: 6 }}>
          <Txt muted style={styles.sectionLabel}>HOJE</Txt>
          <View style={s.row}>
            <Txt style={{ fontFamily: fonts.semibold, fontSize: 18 }}>
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR }).replace(/^./, letter => letter.toUpperCase())}
            </Txt>
            <ChevronDown size={18} color={c.secondary} />
          </View>
        </View>

        {/* Lista de Pacientes (SEM O TRAÇO/ACCENT BAR SOLICITADO) */}
        <View style={{ gap: 12 }}>
          <SectionTitle title={`${filtered.length} PACIENTES REGISTRADOS`} />
          {filtered.map(patient => {
            const wound = wounds.find(w => w.patientId === patient.id);
            const today = todayIds.has(patient.id);
            const latest = visits
              .filter(v => v.patientId === patient.id && v.state === 'Concluído')
              .sort((a, b) => b.date.localeCompare(a.date))[0];
            const trend = wound?.status === 'Piora' ? 'up' : wound?.status === 'Estagnada' ? 'flat' : 'down';

            return (
              <Pressable 
                key={patient.id} 
                accessibilityRole="button" 
                onPress={() => router.push(`/patient/${patient.id}`)}
              >
                <Card dark={today} style={[styles.patientCard, today && { borderColor: c.dark }]}>
                  {/* Cabeçalho do Card - Traço removido */}
                  <View style={s.between}>
                    <View style={[s.row, { flex: 1, minWidth: 0 }]}>
                      <Avatar name={patient.name} color={patient.color} anonymous={presentation} />
                      <View style={{ gap: 3, flex: 1, minWidth: 0 }}>
                        <Txt style={{ color: today ? '#FFF' : c.text, fontFamily: fonts.semibold, fontSize: 16 }} numberOfLines={1}>
                          {presentation ? 'Paciente em apresentação' : patient.name}
                        </Txt>
                        <Txt style={{ color: today ? '#BDBDBD' : c.secondary, fontSize: 12 }} numberOfLines={1}>
                          {presentation ? 'Identificação oculta' : `${patient.sex} · ${new Date().getFullYear() - Number(patient.birthDate.slice(0, 4))} anos`}
                        </Txt>
                      </View>
                    </View>
                    <ChevronRight size={19} color={today ? '#AAA' : c.tertiary} />
                  </View>

                  <Txt style={{ color: today ? '#D2D2D2' : c.secondary, fontSize: 13, lineHeight: 18 }}>
                    {presentation ? 'Dados clínicos ocultos no modo apresentação.' : `${wound?.location ?? 'Sem ferida cadastrada'} · acompanhamento longitudinal`}
                  </Txt>

                  <View style={styles.cardBottom}>
                    <Badge dark={today} tone={wound?.etiology === 'Pé diabético' ? 'red' : 'neutral'}>
                      {presentation ? 'Ferida em acompanhamento' : wound?.etiology ?? 'Sem ferida'}
                    </Badge>
                    <Txt style={{ color: today ? '#C3C3C3' : c.tertiary, fontSize: 11, flex: 1 }}>
                      {latest ? `Último atendimento · ${dateLabel(latest.date)}` : 'Sem atendimento registrado'}
                    </Txt>
                    <View style={[styles.trend, today && { backgroundColor: '#303030' }]}>
                      {trend === 'down' ? (
                        <TrendingDown size={16} color={c.green} />
                      ) : trend === 'up' ? (
                        <TrendingUp size={16} color={c.red} />
                      ) : (
                        <Minus size={16} color={c.amber} />
                      )}
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })}

          {filtered.length === 0 && (
            <Card>
              <Empty 
                title="Nenhum paciente encontrado" 
                description="Cadastre um novo paciente ou ajuste os filtros para ver a lista." 
                action="Adicionar Paciente" 
                onPress={() => setAddModalVisible(true)} 
              />
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Modal Completo e Funcional: Adicionar Paciente */}
      <Modal 
        visible={addModalVisible} 
        animationType="slide" 
        transparent 
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.surface }]}>
            {/* Header do Modal */}
            <View style={s.between}>
              <View style={s.row}>
                <View style={styles.modalIconWrap}>
                  <UserPlus size={20} color={c.red} />
                </View>
                <View>
                  <Txt style={styles.modalTitle}>Novo Paciente</Txt>
                  <Txt muted style={{ fontSize: 12 }}>Cadastro completo no prontuário</Txt>
                </View>
              </View>
              <IconButton icon={X} label="Fechar" onPress={() => setAddModalVisible(false)} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 24 }}>
              {/* Identificação */}
              <SectionTitle title="1. IDENTIFICAÇÃO" />
              <Field 
                label="Nome Completo *" 
                placeholder="Ex.: Maria de Lourdes Silveira" 
                value={newName} 
                onChangeText={setNewName} 
              />

              <View style={styles.rowFields}>
                <Field 
                  label="Data de Nascimento" 
                  placeholder="AAAA-MM-DD (ex.: 1968-04-12)" 
                  value={newBirth} 
                  onChangeText={setNewBirth} 
                />
                <Field 
                  label="CPF" 
                  placeholder="000.000.000-00" 
                  value={newCpf} 
                  onChangeText={setNewCpf} 
                />
              </View>

              <View style={{ gap: 6 }}>
                <Label>Sexo Biológico</Label>
                <Choices 
                  options={['Feminino', 'Masculino']} 
                  value={newSex} 
                  onChange={v => setNewSex(v as any)} 
                />
              </View>

              <View style={styles.rowFields}>
                <Field 
                  label="Telefone / WhatsApp" 
                  placeholder="(11) 98765-4321" 
                  value={newPhone} 
                  onChangeText={setNewPhone} 
                />
                <Field 
                  label="Endereço" 
                  placeholder="Bairro, Cidade" 
                  value={newAddress} 
                  onChangeText={setNewAddress} 
                />
              </View>

              {/* Dados Clínicos Iniciais */}
              <SectionTitle title="2. HISTÓRICO CLÍNICO E ALERGIAS" />
              <Field 
                label="Alergias Conhecidas" 
                placeholder="Ex.: Prata, Iodo, Látex (separe por vírgula)" 
                value={newAllergies} 
                onChangeText={setNewAllergies} 
              />

              <Field 
                label="Comorbidade Principal" 
                placeholder="Ex.: Diabetes Mellitus tipo 2, HAS, Insuficiência Venosa" 
                value={newComorbidity} 
                onChangeText={setNewComorbidity} 
              />

              {/* Primeira Lesão / Ferida */}
              <SectionTitle title="3. LESÃO / FERIDA INICIAL" />
              <Field 
                label="Localização Anatômica da Ferida" 
                placeholder="Ex.: Maléolo medial esquerdo, Calcâneo D, Sacro" 
                value={newWoundLocation} 
                onChangeText={setNewWoundLocation} 
              />

              <View style={{ gap: 6 }}>
                <Label>Etiologia Provável</Label>
                <Choices 
                  options={['Úlcera venosa', 'Pé diabético', 'Lesão por pressão', 'Úlcera arterial', 'Traumática', 'Cirúrgica']} 
                  value={newWoundEtiology} 
                  onChange={setNewWoundEtiology} 
                />
              </View>

              {/* Botão de Conclusão */}
              <Button 
                title="Cadastrar Paciente" 
                icon={Check} 
                loading={savingPatient} 
                onPress={handleSavePatient}
                style={{ marginTop: 8 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 18, paddingBottom: 160, gap: 18 },
  topbar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: c.red, fontFamily: fonts.brand, fontSize: 26, letterSpacing: -0.8 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  calendarRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  calendarDay: { alignItems: 'center', minWidth: 36, gap: 6 },
  dateCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#DDE0E3', alignItems: 'center', justifyContent: 'center' },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.red },
  search: { 
    height: 48, 
    borderRadius: 14, 
    backgroundColor: '#FFF', 
    borderWidth: 1.5, 
    borderColor: c.border, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 14, 
    gap: 10,
  },
  searchHovered: {
    borderColor: '#AEAEAE',
  },
  searchFocused: {
    borderColor: c.red,
    shadowColor: c.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: { 
    flex: 1, 
    minHeight: 44, 
    color: c.text, 
    fontFamily: fonts.regular, 
    fontSize: 14,
    backgroundColor: 'transparent',
    borderWidth: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  sectionLabel: { fontSize: 11, letterSpacing: 1.4, fontFamily: fonts.semibold },
  patientCard: { padding: 18, gap: 12 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  trend: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F8F4' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: c.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    padding: 20,
    gap: 14,
  },
  modalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { fontFamily: fonts.brand, fontSize: 20, color: c.text },
  rowFields: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
});
