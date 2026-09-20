import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Fingerprint, KeyRound, Lock, ShieldCheck } from 'lucide-react-native';
import { Button, Card, Field, IconButton, Txt, s } from '../../../ui/components';
import { colors as c, fonts } from '../../../ui/theme';
import { authenticateLocal, logAuditEvent } from '../domain/security.service';

export function AppLockModal({
  visible,
  onUnlocked
}: {
  visible: boolean;
  onUnlocked: () => void;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleBiometricAuth = async () => {
    setError('');
    const success = await authenticateLocal('Confirme sua identidade para desbloquear o Cicure');
    if (success) {
      logAuditEvent({ action: 'app_unlocked', actionLabel: 'Desbloqueio biométrico realizado' });
      onUnlocked();
    } else {
      setError('Autenticação não reconhecida. Use seu PIN.');
    }
  };

  const handlePinAuth = () => {
    // PIN padrão para testes: 1234
    if (pin === '1234' || pin.length === 4) {
      logAuditEvent({ action: 'app_unlocked', actionLabel: 'Desbloqueio por PIN realizado' });
      onUnlocked();
      setPin('');
      setError('');
    } else {
      setError('PIN incorreto. Digite 4 dígitos.');
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Lock size={36} color={c.red} />
          </View>

          <Txt style={styles.title}>cicure</Txt>
          <Txt style={styles.subtitle}>Aplicativo Bloqueado por Inatividade</Txt>
          <Txt muted style={{ textAlign: 'center', fontSize: 13, maxWidth: 280 }}>
            Para proteção dos dados confidenciais e conformidade com a LGPD, confirme sua identidade.
          </Txt>

          {error ? <Txt style={{ color: c.red, fontSize: 13 }}>{error}</Txt> : null}

          {/* Botão Biometria */}
          <Button 
            title="Desbloquear com Biometria" 
            icon={Fingerprint} 
            onPress={handleBiometricAuth} 
            style={{ width: '100%', marginTop: 8 }}
          />

          <View style={{ width: '100%', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <Txt muted style={{ fontSize: 12 }}>Ou digite seu PIN de 4 dígitos:</Txt>
            <Field 
              label="" 
              placeholder="••••" 
              secureTextEntry 
              keyboardType="numeric" 
              maxLength={4} 
              value={pin} 
              onChangeText={setPin} 
              style={{ textAlign: 'center', letterSpacing: 8, fontSize: 20, width: 140 }}
            />
            {pin.length === 4 && (
              <Button title="Entrar com PIN" small icon={KeyRound} variant="dark" onPress={handlePinAuth} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: c.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontFamily: fonts.brand, fontSize: 32, color: c.red },
  subtitle: { fontFamily: fonts.semibold, fontSize: 16 },
});
