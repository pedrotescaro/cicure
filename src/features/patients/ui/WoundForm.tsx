import { useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, TextInput, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Choices, Field, IconButton, Txt, s } from '../../../ui/components';
import { DateField } from '../../../ui/DateField';
import { useTheme } from '../../../ui/theme';
import { useMotionPreferences } from '../../../ui/useMotionPreferences';
import { uid, useStore } from '../../../data/store';
import type { Wound } from '../../../domain/types';
import { validCalendarDate } from '../../../domain/visit.lifecycle';
import { localDay } from '../../agenda/domain/agenda.service';

export function WoundForm({ patientId, wound, onClose, onSaved }: { patientId: string; wound?: Wound; onClose: () => void; onSaved: (wound: Wound) => void }) {
  const { colors: c } = useTheme();
  const { reduceMotion } = useMotionPreferences();
  const insets = useSafeAreaInsets();
  const save = useStore(state => state.save);
  const [location, setLocation] = useState(wound?.location ?? '');
  const [etiology, setEtiology] = useState(wound?.etiology ?? 'Não informada');
  const [startDate, setStartDate] = useState(wound?.startDate ?? '');
  const [side, setSide] = useState<'Frente' | 'Costas'>(wound?.pin.side ?? 'Frente');
  const [region, setRegion] = useState('');
  const [status, setStatus] = useState<Wound['status']>(wound?.status ?? 'Ativa');
  const [previous, setPrevious] = useState(wound?.previousTreatments ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const close = () => {
    const dirty = location !== (wound?.location ?? '') || etiology !== (wound?.etiology ?? 'Não informada') || startDate !== (wound?.startDate ?? '') || previous !== (wound?.previousTreatments ?? '') || region || side !== (wound?.pin.side ?? 'Frente') || status !== (wound?.status ?? 'Ativa');
    if (saving) return;
    if (!dirty) { onClose(); return; }
    Alert.alert('Descartar alterações?', 'A ferida ainda não foi salva.', [{ text: 'Continuar preenchendo', style: 'cancel' }, { text: 'Descartar', style: 'destructive', onPress: onClose }]);
  };
  const requestClose = () => {
    const focusedInput = TextInput.State.currentlyFocusedInput();
    if (focusedInput) {
      focusedInput.blur();
      Keyboard.dismiss();
      return;
    }
    close();
  };
  const submit = async () => {
    if (!location.trim()) { setError('Informe a localização, incluindo o lado do corpo.'); return; }
    if (startDate && (!validCalendarDate(startDate) || startDate > localDay())) { setError('Selecione uma data de início válida, até hoje.'); return; }
    if (!wound && !region) { setError('Selecione a região do corpo para localizar a ferida no mapa.'); return; }
    const points: Record<string, { x: number; y: number }> = { Cabeça: { x: 100, y: 36 }, Tronco: { x: 100, y: 125 }, 'Braço direito': { x: 140, y: 120 }, 'Braço esquerdo': { x: 60, y: 120 }, 'Perna direita': { x: 115, y: 250 }, 'Perna esquerda': { x: 85, y: 250 } };
    setSaving(true);
    try {
      const point = region ? points[region] : wound?.pin ?? { x: 100, y: 125 };
      const x = region && side === 'Frente' ? 200 - point.x : point.x;
      const next: Wound = { ...wound, id: wound?.id ?? uid(), patientId, location: location.trim(), etiology, startDate, status, previousTreatments: previous.trim(), pin: { x, y: point.y, side } };
      await save('wounds', next); onSaved(next);
    } catch { setError('Não foi possível salvar. Confira os dados e tente novamente.'); }
    finally { setSaving(false); }
  };
  return <Modal visible animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={requestClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={[s.between, { padding: 16 }]}><Txt style={s.h2} accessibilityRole="header">{wound ? 'Editar ferida' : 'Nova ferida'}</Txt><IconButton icon={X} label="Fechar cadastro da ferida" onPress={close} /></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 18, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <Field label="Localização da ferida (obrigatória)" value={location} onChangeText={setLocation} placeholder="Ex.: região interna do tornozelo esquerdo" />
        <Txt>Região no mapa corporal</Txt><Choices options={['Cabeça', 'Tronco', 'Braço direito', 'Braço esquerdo', 'Perna direita', 'Perna esquerda']} value={region} onChange={setRegion} />
        <Txt muted>O marcador indica uma região aproximada. Descreva a localização exata no campo acima.{wound && !region ? ' O ponto atual será mantido se você não escolher outra região.' : ''}</Txt>
        <Choices options={['Frente', 'Costas']} value={side} onChange={setSide} />
        <DateField label="Data de início (se conhecida)" value={startDate} onChange={setStartDate} />
        <Txt>Causa da ferida, conforme avaliação profissional</Txt><Choices options={['Não informada', 'Venosa', 'Arterial', 'Mista', 'Pé diabético', 'Lesão por pressão', 'Traumática', 'Cirúrgica', 'Outra']} value={etiology} onChange={setEtiology} />
        <Txt>Situação atual</Txt><Choices options={['Ativa', 'Em cicatrização', 'Estagnada', 'Piora', 'Cicatrizada']} value={status} onChange={setStatus} />
        <Field label="Tratamentos anteriores" value={previous} onChangeText={setPrevious} multiline placeholder="Registre apenas o histórico conhecido" />
        {!!error && <Txt accessibilityLiveRegion="polite" style={{ color: c.red }}>{error}</Txt>}
        <Button title={wound ? 'Salvar ferida' : 'Cadastrar ferida'} loading={saving} onPress={() => void submit()} />
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>;
}
