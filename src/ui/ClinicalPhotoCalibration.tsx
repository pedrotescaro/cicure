import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import type { Photo, Point } from '../domain/types';
import { calibratePhoto } from '../domain/visit.lifecycle';
import { decimal, number } from '../domain/clinical';
import { Button, Field, Txt } from './components';
import { useTheme } from './theme';

export function ClinicalPhotoCalibration({ photo, onSave }: { photo: Photo; onSave: (photo: Photo) => Promise<void> }) {
  const { colors } = useTheme();
  const [points, setPoints] = useState<Point[]>(photo.referencePoints ?? []);
  const [reference, setReference] = useState(photo.referenceCm ? number(photo.referenceCm, 3) : '');
  const [layout, setLayout] = useState({ width: 0, height: 280 });
  const [coordinates, setCoordinates] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const scale = Math.min(layout.width / photo.width, layout.height / photo.height);
  const offsetX = (layout.width - photo.width * scale) / 2;
  const offsetY = (layout.height - photo.height * scale) / 2;
  const save = async () => {
    setMessage(''); setBusy(true);
    try {
      const calibrated = calibratePhoto(photo, points, decimal(reference));
      await onSave(calibrated);
      setMessage('Referência salva neste aparelho: ' + number(calibrated.pixelsPerCm!, 2) + ' pixels por centímetro.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar a referência. Tente novamente.'); }
    finally { setBusy(false); }
  };
  return <View style={{ gap: 12 }}>
    <Txt>Marque os dois extremos de uma régua visível na foto e informe a distância real entre eles.</Txt>
    <Pressable accessibilityRole="button" accessibilityLabel={'Marcar extremos da referência na fotografia. ' + points.length + ' pontos marcados. Alternativa: informar coordenadas abaixo.'}
      onLayout={event => setLayout(event.nativeEvent.layout)}
      onPress={event => {
        if (!(scale > 0)) return;
        const x = (event.nativeEvent.locationX - offsetX) / scale;
        const y = (event.nativeEvent.locationY - offsetY) / scale;
        if (x < 0 || y < 0 || x > photo.width || y > photo.height) return;
        setPoints(previous => previous.length >= 2 ? [{ x, y }] : [...previous, { x, y }]); setMessage('');
      }} style={{ width: '100%', height: 280, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.bg }}>
      <View pointerEvents="none" style={{ width: '100%', height: '100%' }}><Image source={{ uri: photo.uri }} resizeMode="contain" style={{ width: '100%', height: '100%' }} /></View>
      {points.map((point, index) => <View pointerEvents="none" key={index} style={{ position: 'absolute', left: offsetX + point.x * scale - 14, top: offsetY + point.y * scale - 14, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.red, borderWidth: 2, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><Txt style={{ color: '#FFF', fontSize: 16 }}>{index + 1}</Txt></View>)}
    </Pressable>
    <Txt muted>{points.length} de 2 extremos marcados. Ao tocar depois do segundo ponto, a marcação recomeça.</Txt>
    <Button title={coordinates ? 'Ocultar coordenadas' : 'Informar pontos em pixels'} variant="outline" onPress={() => setCoordinates(!coordinates)} />
    {coordinates && [0, 1].map(index => <View key={index} style={{ gap: 10 }}>
      <Txt>Ponto {index + 1} na imagem original ({photo.width} × {photo.height} pixels)</Txt>
      {(['x', 'y'] as const).map(axis => <Field key={axis} label={'Ponto ' + (index + 1) + ' · eixo ' + axis.toUpperCase() + ' (pixels)'} keyboardType="decimal-pad" value={points[index] ? number(points[index][axis], 2) : ''}
        onChangeText={value => setPoints(previous => { const next = [...previous]; while (next.length <= index) next.push({ x: 0, y: 0 }); next[index] = { ...next[index], [axis]: decimal(value) }; return next; })} />)}
    </View>)}
    <Field label="Distância real entre os pontos (cm)" keyboardType="decimal-pad" placeholder="Ex.: 2,5" value={reference} onChangeText={setReference} />
    <Txt muted style={{ fontSize: 16, lineHeight: 23 }}>Use a régua no mesmo plano da ferida. Perspectiva, curvatura, inclinação e distorção podem alterar a escala. Esta referência não substitui a medição clínica e não calcula automaticamente a área da ferida.</Txt>
    <Button title="Salvar referência da foto" loading={busy} onPress={() => void save()} />
    {photo.rulerConfirmed && <Button title="Remover referência salva" variant="outline" onPress={() => void onSave({ ...photo, rulerConfirmed: false, pixelsPerCm: undefined, referenceCm: undefined, referencePoints: [] }).catch(() => setMessage('Não foi possível remover a referência. Tente novamente.'))} />}
    {Boolean(message) && <Txt accessibilityLiveRegion="polite">{message}</Txt>}
  </View>;
}
