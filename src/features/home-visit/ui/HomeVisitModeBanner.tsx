import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Home, Wifi, WifiOff, CheckCircle2 } from 'lucide-react-native';
import { Badge, Button, Card, Txt, s } from '../../../ui/components';
import { colors as c, fonts, useTheme } from '../../../ui/theme';

export function HomeVisitModeBanner({
  isOfflineReady = true,
  onStartVisit
}: {
  isOfflineReady?: boolean;
  onStartVisit?: () => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <Card 
      style={[
        styles.bannerCard,
        isDark 
          ? { backgroundColor: 'rgba(22, 101, 52, 0.15)', borderColor: 'rgba(34, 197, 94, 0.3)' }
          : { backgroundColor: '#F0F9F5', borderColor: '#C8E6D9' }
      ]}
    >
      <View style={s.between}>
        <View style={s.row}>
          <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : colors.greenSoft }]}>
            <Home size={22} color={colors.green} />
          </View>
          <View style={{ gap: 2 }}>
            <Txt style={styles.bannerTitle}>Modo Visita Domiciliar</Txt>
            <View style={s.row}>
              <CheckCircle2 size={13} color={colors.green} />
              <Txt style={{ fontSize: 12, color: colors.green, fontFamily: fonts.medium }}>
                Prontuário 100% sincronizado no aparelho (Offline-Ready)
              </Txt>
            </View>
          </View>
        </View>
        <Badge tone="green">Offline OK</Badge>
      </View>

      <Txt muted style={{ fontSize: 12, lineHeight: 17 }}>
        Interface adaptada com botões táteis ampliados para uso com luvas e atendimento domiciliar sem necessidade de internet.
      </Txt>

      {onStartVisit && (
        <Button 
          title="Iniciar Atendimento Domiciliar Rápido" 
          variant="primary" 
          onPress={onStartVisit}
          style={{ minHeight: 52 }}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  bannerCard: {
    gap: 10,
    marginVertical: 6,
  },
  bannerTitle: { fontFamily: fonts.semibold, fontSize: 15 },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
