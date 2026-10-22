import { useState } from 'react';
import { Image, ScrollView, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStore } from '../../../data/store';
import { Button, Card, Empty, Txt, s } from '../../../ui/components';
import { useTheme } from '../../../ui/theme';
import { SupportPage } from '../../support/ui/SupportPage';
import { dateLabel } from '../../../domain/clinical';

export default function PhotoHistoryScreen() {
  const { id, woundId } = useLocalSearchParams<{ id: string; woundId?: string }>(); const store = useStore(); const router = useRouter();
  const { colors: c } = useTheme(); const { width, fontScale } = useWindowDimensions();
  const wounds = store.data.wounds.filter(wound => wound.patientId === id && !wound.deletedAt);
  const [selectedWound, setSelectedWound] = useState(woundId || wounds[0]?.id || ''); const [selected, setSelected] = useState<string[]>([]);
  const photos = store.data.visits.filter(visit => visit.patientId === id && visit.woundId === selectedWound && !visit.deletedAt).flatMap(visit => visit.photos.map(photo => ({ ...photo, visitId: visit.id, visitState: visit.state }))).sort((a, b) => b.date.localeCompare(a.date));
  const comparison = photos.filter(photo => selected.includes(photo.id));
  const choose = (photoId: string) => setSelected(current => current.includes(photoId) ? current.filter(value => value !== photoId) : [...current.slice(-1), photoId]);
  return <SupportPage title="Fotos e comparação" backTo={`/patient/${id}`}><Txt>Compare fotografias da mesma ferida. Distância, luz e posição podem alterar a aparência; esta visualização não determina diagnóstico ou melhora clínica.</Txt><View style={{ gap: 10 }}>{wounds.map(wound => <Button key={wound.id} title={wound.location} variant={selectedWound === wound.id ? 'dark' : 'outline'} onPress={() => { setSelectedWound(wound.id); setSelected([]); }} />)}</View>
    {!photos.length ? <Empty title="Nenhuma fotografia desta ferida" description="Anexe uma foto durante o atendimento, com autorização do paciente." /> : <>
      <Txt style={s.h2}>Escolha duas fotos para comparar</Txt>
      {comparison.length === 2 && <View style={{ flexDirection: width > 600 && fontScale < 1.4 ? 'row' : 'column', gap: 16 }}>{comparison.map(photo => <Card key={photo.id} style={{ flex: 1, gap: 12 }}><Txt>{dateLabel(photo.date, 'dd/MM/yyyy HH:mm')} · {photo.type}</Txt><Image source={{ uri: photo.uri }} resizeMode="contain" style={{ width: '100%', height: 300, backgroundColor: c.surfaceSubtle }} accessibilityLabel={`Fotografia da ferida ${wounds.find(wound => wound.id === selectedWound)?.location} em ${dateLabel(photo.date)}`} /><Txt muted>{photo.referenceCm && photo.pixelsPerCm ? `Referência informada: ${photo.referenceCm.toLocaleString('pt-BR')} cm. Não compensa perspectiva ou profundidade.` : 'Sem referência de escala. Não compare dimensões apenas pela imagem.'}</Txt></Card>)}</View>}
      <ScrollView horizontal contentContainerStyle={{ gap: 16 }} accessibilityLabel="Histórico de fotografias">{photos.map(photo => <Card key={photo.id} style={{ width: Math.max(240, Math.min(width - 64, 320)), gap: 12 }}><Txt>{dateLabel(photo.date, 'dd/MM/yyyy HH:mm')}</Txt><Txt muted>{photo.type} · {photo.visitState}</Txt><Image source={{ uri: photo.uri }} resizeMode="contain" style={{ width: '100%', height: 190, backgroundColor: c.surfaceSubtle }} accessibilityLabel={`Fotografia em ${dateLabel(photo.date)}`} /><Button title={selected.includes(photo.id) ? 'Retirar da comparação' : 'Selecionar para comparar'} variant={selected.includes(photo.id) ? 'dark' : 'outline'} onPress={() => choose(photo.id)} /><Button title="Abrir atendimento desta foto" variant="ghost" onPress={() => router.push(`/care/${photo.visitId}`)} /></Card>)}</ScrollView>
    </>}
  </SupportPage>;
}
