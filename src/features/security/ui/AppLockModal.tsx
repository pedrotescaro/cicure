import { useState } from 'react';
import { Modal, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { Button, Txt, s } from '../../../ui/components';
import { useTheme } from '../../../ui/theme';
import { authenticateLocal } from '../domain/security.service';
export function AppLockModal({ visible, onUnlocked }: { visible: boolean; onUnlocked: () => void }) {
  const { colors: c } = useTheme(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const unlock = async () => { setBusy(true); setError(''); try { if (await authenticateLocal('Confirme sua identidade para abrir o Cicure')) onUnlocked(); else setError('Não foi possível confirmar sua identidade. Tente novamente com a biometria ou o bloqueio deste aparelho.'); } finally { setBusy(false); } };
  return <Modal visible={visible} animationType="none" onRequestClose={() => {}}><View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', padding: 28, gap: 24 }}><Lock size={40} color={c.red} /><Txt style={s.h1}>Cicure bloqueado</Txt><Txt>Use a biometria, o padrão ou a senha configurada no Android para voltar aos seus registros.</Txt>{!!error && <Txt accessibilityRole="alert" style={{ color: c.red }}>{error}</Txt>}<Button title="Desbloquear com o Android" onPress={() => void unlock()} loading={busy} /></View></Modal>;
}
