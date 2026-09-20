import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AlertCircle, AlertTriangle, Info, ShieldAlert, Lightbulb } from 'lucide-react-native';
import { Card, Badge, Txt, s } from '../../../ui/components';
import { colors as c, fonts } from '../../../ui/theme';
import type { ClinicalAlert, AlertSeverity } from '../domain/types';

const SEVERITY_ICONS: Record<AlertSeverity, any> = {
  urgente: AlertCircle,
  aviso: AlertTriangle,
  info: Info
};

export function AlertBanner({ alerts }: { alerts: ClinicalAlert[] }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <View style={styles.container}>
      {alerts.map(alert => {
        const Icon = SEVERITY_ICONS[alert.severity] || AlertCircle;
        const isUrgent = alert.severity === 'urgente';
        const isWarning = alert.severity === 'aviso';

        return (
          <Card 
            key={alert.id}
            style={[
              styles.alertCard,
              isUrgent && { backgroundColor: c.redSoft, borderColor: '#F3C5C5' },
              isWarning && { backgroundColor: c.amberSoft, borderColor: '#F5DEB3' },
            ]}
          >
            <View style={s.row}>
              <Icon 
                size={22} 
                color={isUrgent ? c.red : isWarning ? c.amber : c.secondary} 
              />
              <View style={{ flex: 1, gap: 3 }}>
                <View style={s.between}>
                  <Txt style={[styles.title, isUrgent && { color: c.red }]}>{alert.title}</Txt>
                  <Badge tone={isUrgent ? 'red' : isWarning ? 'amber' : 'neutral'}>
                    {alert.severity}
                  </Badge>
                </View>
                <Txt style={styles.message}>{alert.message}</Txt>
                <View style={[s.row, { gap: 4, marginTop: 2, alignItems: 'flex-start' }]}>
                  <Lightbulb size={13} color={c.amber} style={{ marginTop: 2 }} />
                  <Txt muted style={[styles.recommendation, { flex: 1 }]}>
                    <Txt style={{ fontFamily: fonts.medium }}>Recomendação:</Txt> {alert.recommendation}
                  </Txt>
                </View>
                <Txt muted style={{ fontSize: 10, marginTop: 2 }}>
                  Suporte à decisão clínica (v{alert.ruleVersion}) · Não substitui a avaliação do profissional.
                </Txt>
              </View>
            </View>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, marginVertical: 8 },
  alertCard: { padding: 14, gap: 8, borderWidth: 1 },
  title: { fontFamily: fonts.semibold, fontSize: 14, color: c.text },
  message: { fontSize: 13, lineHeight: 18, color: c.text },
  recommendation: { fontSize: 12, lineHeight: 16, color: c.secondary },
});
