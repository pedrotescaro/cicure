import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Search, X } from 'lucide-react-native';
import { Badge, Empty, Field, IconButton, Txt, s } from '../../../ui/components';
import { fonts, useTheme } from '../../../ui/theme';
import { useMotionPreferences } from '../../../ui/useMotionPreferences';
import { useStore } from '../../../data/store';
import { dateLabel } from '../../../domain/clinical';
import { normalizedPatientSearch } from '../../patients/domain/patient-form';

export function GlobalSearchModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const { colors: c } = useTheme();
  const { reduceMotion } = useMotionPreferences();
  const insets = useSafeAreaInsets();
  const { patients, wounds, visits, reports, products, inventory_items: inventoryItems } = useStore(state => state.data);
  const presentation = useStore(state => state.presentation);
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const q = normalizedPatientSearch(query);
    if (!q || presentation) return [];
    const includes = (value: string) => normalizedPatientSearch(value).includes(q);
    const patientName = (id: string) => patients.find(patient => patient.id === id)?.name || 'Paciente não encontrado';
    const found: { id: string; type: string; title: string; detail: string; route: string }[] = [];
    patients.filter(patient => !patient.deletedAt && includes(`${patient.name} ${patient.cpf} ${patient.phone}`)).forEach(patient => found.push({ id: `patient-${patient.id}`, type: 'Paciente', title: patient.name, detail: patient.status, route: `/patient/${patient.id}` }));
    wounds.filter(wound => !wound.deletedAt && includes(`${wound.location} ${wound.etiology}`)).forEach(wound => found.push({ id: `wound-${wound.id}`, type: 'Ferida', title: wound.location, detail: `${patientName(wound.patientId)} · ${wound.etiology}`, route: `/patient/${wound.patientId}/timeline?woundId=${wound.id}` }));
    visits.filter(visit => !visit.deletedAt && includes(`${visit.plan} ${visit.guidance} ${dateLabel(visit.date)} ${patientName(visit.patientId)}`)).forEach(visit => found.push({ id: `visit-${visit.id}`, type: 'Atendimento', title: `${dateLabel(visit.date)} · ${patientName(visit.patientId)}`, detail: `${visit.state} · ${wounds.find(wound => wound.id === visit.woundId)?.location || 'Ferida não identificada'}`, route: visit.state === 'Concluído' ? `/care/${visit.id}` : `/care/new?visitId=${visit.id}` }));
    reports.filter(report => includes(`${report.type} ${dateLabel(report.createdAt)} ${patientName(report.patientId)}`)).forEach(report => found.push({ id: `report-${report.id}`, type: 'Relatório', title: `${report.type} · ${patientName(report.patientId)}`, detail: dateLabel(report.createdAt), route: '/reports' }));
    products.filter(product => includes(product.name)).forEach(product => found.push({ id: `product-${product.id}`, type: 'Material', title: product.name, detail: product.presentation, route: '/inventory' }));
    inventoryItems.filter(item => !item.deletedAt && includes(`${item.name} ${item.manufacturer} ${item.presentation}`)).forEach(item => found.push({ id: `inventory-${item.id}`, type: 'Material em estoque', title: item.name, detail: `${item.presentation} · ${item.currentStock} ${item.unit}`, route: '/inventory' }));
    return found;
  }, [query, patients, wounds, visits, reports, products, inventoryItems, presentation]);
  return <Modal visible={visible} animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={[s.between, { padding: 16 }]}><Txt accessibilityRole="header" style={s.h2}>Buscar no Cicure</Txt><IconButton icon={X} label="Fechar busca" onPress={onClose} /></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 20 }}>
        {presentation ? <Empty title="Identificação protegida" description="Desative o modo apresentação no Menu para buscar registros identificados." /> : <>
          <Field label="O que deseja encontrar?" placeholder="Nome, CPF, ferida, conduta ou material" value={query} onChangeText={setQuery} autoFocus autoCorrect={false} />
          <Txt muted accessibilityLiveRegion="polite">{query.trim() ? `${results.length} resultados encontrados` : 'Busque pacientes, feridas, atendimentos, relatórios e materiais desta conta.'}</Txt>
          {results.slice(0, 40).map(result => <Pressable key={result.id} accessibilityRole="button" onPress={() => { onClose(); router.push(result.route as never); }} style={{ paddingVertical: 16, minHeight: 72, borderBottomWidth: 1, borderBottomColor: c.border, gap: 10 }}><Badge>{result.type}</Badge><View style={s.row}><View style={{ flex: 1, gap: 6 }}><Txt style={{ fontFamily: fonts.semibold }}>{result.title}</Txt><Txt muted>{result.detail}</Txt></View><ChevronRight size={22} color={c.secondary} /></View></Pressable>)}
          {results.length > 40 && <Txt muted>Mostrando os primeiros 40 resultados. Acrescente mais detalhes à busca para encontrar o registro.</Txt>}
          {!!query.trim() && !results.length && <Empty icon={Search} title="Nenhum resultado encontrado" description="Confira a escrita ou tente buscar pelo nome do paciente ou pela localização da ferida." />}
        </>}
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>;
}
