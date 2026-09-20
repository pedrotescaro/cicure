import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge, Txt, s } from '../../../ui/components';
import { colors as c, fonts } from '../../../ui/theme';
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
  return (
    <View style={styles.card}>
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
        <View style={styles.progressBarBg}>
          <View 
            style={[
              styles.progressBarFill, 
              { 
                width: `${goal.progress}%`,
                backgroundColor: goal.status === 'Atingida' ? c.green : c.red 
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
              goal.status === st && styles.statusBtnActive
            ]}
          >
            <Txt style={[
              styles.statusBtnText,
              goal.status === st && styles.statusBtnTextActive
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
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
    gap: 10,
    marginBottom: 10,
  },
  description: { fontFamily: fonts.semibold, fontSize: 14, flex: 1, color: c.text },
  progressContainer: { gap: 4 },
  progressBarBg: { height: 8, backgroundColor: c.border, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  actionsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', paddingTop: 4 },
  statusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: '#FFF'
  },
  statusBtnActive: { backgroundColor: c.dark, borderColor: c.dark },
  statusBtnText: { fontSize: 11, color: c.secondary, fontFamily: fonts.medium },
  statusBtnTextActive: { color: '#FFF' }
});
