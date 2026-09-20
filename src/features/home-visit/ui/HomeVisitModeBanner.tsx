import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Home, Wifi, WifiOff, CheckCircle2 } from 'lucide-react-native';
import { Badge, Button, Card, Txt, s } from '../../../ui/components';
import { colors as c, fonts } from '../../../ui/theme';

export function HomeVisitModeBanner({
  isOfflineReady = true,
  onStartVisit
}: {
  isOfflineReady?: boolean;
  onStartVisit?: () => void;
}) {
  return (
    <Card style={styles.bannerCard}>
      <View style={s.between}>
        <View style={s.row}>
          <View style={styles.iconCircle}>
            <Home size={22} color={c.green} />
          </View>
          <View style={{ gap: 2 }}>
            <Txt style={styles.bannerTitle}>Modo Visita Domiciliar</Txt>
            <View style={s.row}>
              <CheckCircle2 size={13} color={c.green} />
              <Txt style={{ fontSize: 12, color: c.green, fontFamily: fonts.medium }}>
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
    backgroundColor: '#F0F9F5',
    borderColor: '#C8E6D9',
    gap: 10,
    marginVertical: 6,
  },
  bannerTitle: { fontFamily: fonts.semibold, fontSize: 15, color: c.text },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
