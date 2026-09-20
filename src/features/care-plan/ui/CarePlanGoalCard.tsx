import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge, Txt, s } from '../../../ui/components';
import { fonts, useTheme } from '../../../ui/theme';
import type { CarePlanGoal, GoalStatus } from '../domain/types';

const STATUS_TONES: Record<GoalStatus, 'neutral' | 'red' | 'green' | 'amber'> = {
  'Ativa': 'amber',
  'Atingida': 'green',
  'Substituída': 'neutral',
  'Cancelada': 'red'
};

export function CarePlanGoalCard({
  goal,
  onUpdateStatus,
  onUpdateProgress
}: {
  goal: CarePlanGoal;
  onUpdateStatus: (newStatus: GoalStatus) => void;
  onUpdateProgress: (newProgress: number) => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={s.between}>
        <Txt style={styles.description}>{goal.description}</Txt>
        <Badge tone={STATUS_TONES[goal.status]}>{goal.status}</Badge>
      </View>

      {goal.targetDate ? (
        <Txt muted style={{ fontSize: 12 }}>Data prevista: {goal.targetDate}</Txt>
      ) : null}

      {/* Barra de Progresso */}
      <View style={styles.progressContainer}>
        <View style={s.between}>
          <Txt muted style={{ fontSize: 11 }}>Progresso</Txt>
          <Txt style={{ fontFamily: fonts.semibold, fontSize: 12 }}>{goal.progress}%</Txt>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
          <View 
            style={[
              styles.progressBarFill, 
              { 
                width: `${goal.progress}%`,
                backgroundColor: goal.status === 'Atingida' ? colors.green : colors.red 
              }
            ]} 
          />
        </View>
      </View>

      {/* Ações Rápidas de Status */}
      <View style={styles.actionsRow}>
        {(['Ativa', 'Atingida', 'Substituída', 'Cancelada'] as GoalStatus[]).map(st => (
          <Pressable
            key={st}
            onPress={() => onUpdateStatus(st)}
            style={[
              styles.statusBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
              goal.status === st && { backgroundColor: colors.dark, borderColor: colors.dark }
            ]}
          >
            <Txt style={[
              styles.statusBtnText,
              { color: colors.secondary },
              goal.status === st && { color: isDark ? '#141414' : '#FFF' }
            ]}>
              {st}
            </Txt>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginBottom: 10,
  },
  description: { fontFamily: fonts.semibold, fontSize: 14, flex: 1 },
  progressContainer: { gap: 4 },
  progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  actionsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', paddingTop: 4 },
  statusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBtnText: { fontSize: 11, fontFamily: fonts.medium },
});
