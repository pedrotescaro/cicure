import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { 
  UserPlus, 
  HeartPulse, 
  Camera, 
  RefreshCw, 
  FileText, 
  ChevronRight, 
  Check, 
  Sparkles 
} from 'lucide-react-native';
import { Button, Card, Txt } from '../../../ui/components';
import { useTheme, type ColorPalette, fonts } from '../../../ui/theme';

const ONBOARDING_STEPS = [
  {
    icon: UserPlus,
    title: '1. Prontuário do Paciente',
    description: 'Comece pela aba Pacientes: toque em Novo paciente e registre os dados necessários para o acompanhamento.'
  },
  {
    icon: HeartPulse,
    title: '2. Múltiplas Lesões e Mapa',
    description: 'Cadastre feridas simultâneas com localização anatômica precisa, etiologia e histórico individual de evolução.'
  },
  {
    icon: Camera,
    title: '3. Fotografia Calibrada',
    description: 'Adicione fotos ao atendimento para acompanhar a evolução da ferida ao longo das consultas.'
  },
  {
    icon: RefreshCw,
    title: '4. Funcionamento Offline-First',
    description: 'Seus registros ficam salvos neste aparelho, mesmo sem internet. Acompanhe os envios à nuvem na Central de Sincronização quando ela estiver configurada.'
  },
  {
    icon: FileText,
    title: '5. Laudos, Relatórios e Prescrições',
    description: 'Consulte os atendimentos registrados e gere relatórios em PDF pela aba Relatórios.'
  }
];

export function OnboardingModal({
  visible,
  onFinish,
  onShow
}: {
  visible: boolean;
  onFinish: () => void;
  onShow?: () => void;
}) {
  const { colors: c } = useTheme();
  const styles = makeStyles(c);
  useEffect(() => { if (visible) setStep(0); }, [visible]);
  const [step, setStep] = useState(0);

  const current = ONBOARDING_STEPS[step];
  const Icon = current.icon;

  const handleNext = () => {
    if (step < ONBOARDING_STEPS.length - 1) {
      setStep(prev => prev + 1);
    } else {
      onFinish();
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onShow={onShow} onRequestClose={onFinish}>
      <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <Txt style={styles.brand}>cicure</Txt>
          <Txt style={styles.subtitle}>Boas-vindas à sua plataforma clínica</Txt>

          {/* Card da Etapa */}
          <Card style={styles.stepCard}>
            <View style={styles.iconCircle}>
              <Icon size={32} color={c.red} />
            </View>
            <Txt style={styles.stepTitle}>{current.title}</Txt>
            <Txt muted style={styles.stepDesc}>{current.description}</Txt>
          </Card>

          {/* Indicadores de Progresso */}
          <View style={styles.dotsRow}>
            {ONBOARDING_STEPS.map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.dot, 
                  i === step ? styles.dotActive : styles.dotInactive
                ]} 
              />
            ))}
          </View>

          {/* Botão de Avanço */}
          <Button 
            title={step === ONBOARDING_STEPS.length - 1 ? 'Começar a Usar o Cicure' : 'Avançar'} 
            icon={step === ONBOARDING_STEPS.length - 1 ? Check : ChevronRight}
            onPress={handleNext}
            style={{ width: '100%', minHeight: 52 }}
          />
        </View>
      </ScrollView>
    </Modal>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: c.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 16,
  },
  brand: { fontFamily: fonts.brand, fontSize: 36, color: c.red, letterSpacing: -1 },
  subtitle: { fontFamily: fonts.semibold, fontSize: 16, textAlign: 'center' },
  stepCard: {
    width: '100%',
    alignItems: 'center',
    padding: 24,
    gap: 12,
    marginVertical: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: c.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: { fontFamily: fonts.semibold, fontSize: 18, textAlign: 'center' },
  stepDesc: { fontSize: 14, lineHeight: 20, textAlign: 'center', color: c.secondary },
  dotsRow: { flexDirection: 'row', gap: 6, marginVertical: 8 },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 24, backgroundColor: c.red },
  dotInactive: { width: 6, backgroundColor: c.border },
});
