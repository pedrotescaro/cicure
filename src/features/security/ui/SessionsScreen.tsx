import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Laptop, Smartphone, Tablet, LogOut, ShieldCheck } from 'lucide-react-native';
import { Badge, Button, Card, Empty, IconButton, SectionTitle, Txt, safeBack, s } from '../../../ui/components';
import { colors as c, fonts, useTheme } from '../../../ui/theme';
import { INITIAL_SESSIONS } from '../domain/security.service';
import type { DeviceSession } from '../domain/types';

export default function SessionsScreen() {
  const router = useRouter();
  const { colors: c } = useTheme();
  const [sessions, setSessions] = useState<DeviceSession[]>(INITIAL_SESSIONS);

  const handleRevoke = (id: string, name: string) => {
    Alert.alert(
      'Encerrar Sessão',
      `Deseja desconectar o dispositivo "${name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Encerrar',
          style: 'destructive',
          onPress: () => {
            setSessions(prev => prev.filter(s => s.id !== id));
            Alert.alert('Sessão Encerrada', 'O dispositivo foi desconectado com sucesso.');
          }
        }
      ]
    );
  };

  const handleRevokeAllOthers = () => {
    Alert.alert(
      'Encerrar Todas as Outras Sessões',
      'Todos os outros telefones, tablets e computadores serão desconectados imediatamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar Outros',
          style: 'destructive',
          onPress: () => {
            setSessions(prev => prev.filter(s => s.isCurrent));
            Alert.alert('Sucesso', 'Apenas o aparelho atual permanece conectado.');
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <IconButton icon={ChevronLeft} label="Voltar" onPress={() => safeBack(router, '/more')} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={styles.headerTitle}>Sessões Ativas</Txt>
          <Txt muted style={{ fontSize: 13 }}>Dispositivos conectados à sua conta</Txt>
        </View>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 12 }}>
            <Card style={{ backgroundColor: c.surfaceSubtle, gap: 6 }}>
              <Txt style={{ fontFamily: fonts.semibold, fontSize: 14 }}>Segurança de Acesso Multidispositivo</Txt>
              <Txt muted style={{ fontSize: 12, lineHeight: 18 }}>
                Se você não reconhecer algum aparelho conectado ou tiver utilizado um computador público, encerre a sessão correspondente imediatamente.
              </Txt>
            </Card>

            {sessions.length > 1 && (
              <Button 
                title="Encerrar todas as outras sessões" 
                variant="outline" 
                icon={LogOut} 
                small 
                onPress={handleRevokeAllOthers} 
              />
            )}
          </View>
        }
        renderItem={({ item }) => {
          const Icon = item.platform === 'ios' || item.platform === 'android' ? Smartphone : Laptop;
          return (
            <Card style={styles.sessionCard}>
              <View style={s.row}>
                <View style={[styles.iconCircle, { backgroundColor: c.surfaceSubtle }]}>
                  <Icon size={20} color={c.text} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={s.row}>
                    <Txt style={styles.deviceName}>{item.deviceName}</Txt>
                    {item.isCurrent && <Badge tone="green">Este aparelho</Badge>}
                  </View>
                  <Txt muted style={{ fontSize: 12 }}>IP: {item.ipAddress}</Txt>
                  <Txt muted style={{ fontSize: 11 }}>Último acesso: {item.lastActive}</Txt>
                </View>

                {!item.isCurrent && (
                  <IconButton 
                    icon={LogOut} 
                    label="Desconectar" 
                    color={c.red} 
                    onPress={() => handleRevoke(item.id, item.deviceName)} 
                  />
                )}
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: fonts.brand, fontSize: 22 },
  content: { padding: 16, gap: 10, paddingBottom: 100 },
  sessionCard: { gap: 8, marginBottom: 8 },
  deviceName: { fontFamily: fonts.semibold, fontSize: 15 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
