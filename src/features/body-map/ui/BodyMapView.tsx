import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { ChevronLeft } from 'lucide-react-native';
import { Badge, Button, Card, IconButton, Pills, SectionTitle, Txt, safeBack, s } from '../../../ui/components';
import { colors as c, fonts, useTheme } from '../../../ui/theme';
import { dateLabel } from '../../../domain/clinical';
import type { Wound, WoundStatus } from '../../../domain/types';

const STATUS_COLORS: Record<WoundStatus, string> = {
  'Em cicatrização': '#2E7D5B', // Verde clínico
  'Estagnada': '#C77D00',      // Âmbar
  'Piora': '#D62828',          // Vermelho
  'Cicatrizada': '#1E5631',    // Verde escuro
  'Ativa': '#D62828'           // Vermelho
};

export default function BodyMapView({
  wounds,
  patientName,
  onSelectWound
}: {
  wounds: Wound[];
  patientName: string;
  onSelectWound?: (wound: Wound) => void;
}) {
  const router = useRouter();
  const { colors: palette } = useTheme();
  const [side, setSide] = useState<'Frente' | 'Costas'>('Frente');
  const [selectedWound, setSelectedWound] = useState<Wound | null>(wounds[0] || null);

  const displayedWounds = wounds.filter(w => (w.pin?.side || 'Frente') === side);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.bg }} contentContainerStyle={[styles.container, { backgroundColor: palette.bg, flexGrow: 1 }]}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Voltar" onPress={() => safeBack(router, wounds[0]?.patientId ? `/patient/${wounds[0].patientId}` : '/patients')} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={styles.headerTitle}>Mapa corporal</Txt>
          <Txt muted>{patientName} · {wounds.length} feridas</Txt>
        </View>
      </View>

      {/* Seletor Frente / Costas */}
      <View style={styles.selectorBar}>
        <Pills
          options={['Frente', 'Costas']}
          value={side}
          onChange={v => { const next = v as 'Frente' | 'Costas'; setSide(next); setSelectedWound(wounds.find(wound => wound.pin.side === next) ?? null); }}
        />
      </View>

      {/* Canvas SVG do Corpo Humano com Pinos Interativos */}
      <Txt muted>Os marcadores indicam regiões aproximadas. Para selecionar uma ferida, toque no mapa ou na lista abaixo.</Txt>
      <View style={[styles.svgContainer, { backgroundColor: palette.surfaceSubtle, borderColor: palette.border }]}>
        <Svg width="100%" height={340} viewBox="0 0 240 360">
          {/* Silhueta Anatômica Estilizada */}
          <G fill="#F0F0F0" stroke={c.border} strokeWidth="2">
            {/* Cabeça */}
            <Circle cx="120" cy="36" r="22" />
            {/* Pescoço */}
            <Rect x="113" y="58" width="14" height="12" rx="3" />
            {/* Tronco */}
            <Path d="M86 70 L154 70 L146 180 L94 180 Z" />
            {/* Braço Esquerdo */}
            <Path d="M84 72 L62 160 L72 162 L90 84 Z" />
            {/* Braço Direito */}
            <Path d="M156 72 L178 160 L168 162 L150 84 Z" />
            {/* Perna Esquerda */}
            <Path d="M96 180 L88 320 L108 320 L116 180 Z" />
            {/* Perna Direita */}
            <Path d="M144 180 L152 320 L132 320 L124 180 Z" />
          </G>

          {/* Marcadores das Feridas: F01, F02, F03 */}
          {displayedWounds.map((w, index) => {
            const shortId = `F${wounds.findIndex(item => item.id === w.id) + 1}`;
            const pinColor = STATUS_COLORS[w.status] || c.red;
            const posX = w.pin?.x ? (w.pin.x * 240) / 200 : 88 + (index * 24);
            const posY = w.pin?.y ? (w.pin.y * 360) / 360 : 190 + (index * 45);
            const isSelected = selectedWound?.id === w.id;

            return (
              <G
                key={w.id}
                onPress={() => {
                  setSelectedWound(w);
                  if (onSelectWound) onSelectWound(w);
                }}
              >
                {/* Círculo de Destaque */}
                {isSelected && (
                  <Circle cx={posX} cy={posY} r="20" fill={pinColor} opacity={0.25} />
                )}
                <Circle cx={posX} cy={posY} r="14" fill={pinColor} stroke="#FFF" strokeWidth="2" />
                <SvgText
                  x={posX}
                  y={posY + 4}
                  fill="#FFF"
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {shortId}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>

      <View style={{ gap: 8, marginTop: 16 }}>
        <SectionTitle title={`Feridas na ${side.toLocaleLowerCase('pt-BR')}`} />
        {displayedWounds.map(wound => <Pressable key={wound.id} accessibilityRole="button" accessibilityState={{ selected: wound.id === selectedWound?.id }} onPress={() => { setSelectedWound(wound); onSelectWound?.(wound); }} style={{ padding: 16, minHeight: 56, borderRadius: 12, borderWidth: 1, borderColor: wound.id === selectedWound?.id ? palette.red : palette.border, backgroundColor: wound.id === selectedWound?.id ? palette.redSoft : palette.surface }}><Txt>Ferida {wounds.findIndex(item => item.id === wound.id) + 1}: {wound.location}</Txt><Txt muted>{wound.status}</Txt></Pressable>)}
        {!displayedWounds.length && <Txt muted>Nenhuma ferida cadastrada neste lado do corpo.</Txt>}
      </View>

      {/* Card da Ferida Selecionada */}
      {selectedWound ? (
        <Card style={styles.selectedCard}>
          <View style={[s.between, { flexWrap: 'wrap' }]}>
            <View style={{ gap: 2, flexShrink: 1 }}>
              <Txt style={{ fontFamily: fonts.semibold, fontSize: 16 }}>
                {selectedWound.location}
              </Txt>
              <Txt muted>Causa registrada: {selectedWound.etiology}</Txt>
            </View>
            <Badge tone={selectedWound.status === 'Cicatrizada' ? 'green' : 'red'}>
              {selectedWound.status}
            </Badge>
          </View>

          <Txt muted>
            Tratamentos anteriores: {selectedWound.previousTreatments || 'Não informados'}
          </Txt>

          <View style={[styles.cardActions, { flexDirection: 'column', gap: 12, alignItems: 'stretch', borderTopColor: palette.border }]}>
            <Txt muted>Início: {dateLabel(selectedWound.startDate)}</Txt>
            <Button title="Atender esta ferida" onPress={() => router.push(`/care/new?patientId=${selectedWound.patientId}&woundId=${selectedWound.id}`)} />
            <Button title="Ver histórico desta ferida" variant="outline" onPress={() => router.push(`/patient/${selectedWound.patientId}/timeline?woundId=${selectedWound.id}`)} />
          </View>
        </Card>
      ) : null}

      {/* Legenda de Cores */}
      <View style={[styles.legendRow, { flexWrap: 'wrap', gap: 16 }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS['Ativa'] }]} />
          <Txt style={styles.legendText}>Ativa / Piora</Txt>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS['Estagnada'] }]} />
          <Txt style={styles.legendText}>Estagnada</Txt>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS['Em cicatrização'] }]} />
          <Txt style={styles.legendText}>Em Cicatrização</Txt>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS['Cicatrizada'] }]} />
          <Txt style={styles.legendText}>Cicatrizada</Txt>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: c.bg, padding: 16, paddingBottom: 60 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  headerTitle: { fontFamily: fonts.brand, fontSize: 22 },
  selectorBar: { paddingVertical: 10, alignItems: 'center' },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    padding: 10,
  },
  selectedCard: { marginTop: 14, gap: 10 },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: 8,
  },
  careBtn: {
    backgroundColor: c.red,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 14,
    paddingHorizontal: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 14, fontFamily: fonts.medium },
});
