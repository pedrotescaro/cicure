import React, { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
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
import { Button, Card, IconButton, Txt, s } from '../../../ui/components';
import { colors as c, fonts } from '../../../ui/theme';

const ONBOARDING_STEPS = [
  {
    icon: UserPlus,
    title: '1. Prontuário do Paciente',
    description: 'Cadastre identificação, comorbidades, alergias e histórico clínico do paciente com proteção LGPD total.'
  },
  {
    icon: HeartPulse,
    title: '2. Múltiplas Lesões e Mapa',
    description: 'Cadastre feridas simultâneas com localização anatômica precisa, etiologia e histórico individual de evolução.'
  },
  {
    icon: Camera,
    title: '3. Fotografia Calibrada',
    description: 'Anexe fotos clínicas com régua descartável para medição automática e nunca salve no rolo pessoal da câmera.'
  },
  {
    icon: RefreshCw,
    title: '4. Funcionamento Offline-First',
    description: 'Atenda em domicílio ou zonas sem sinal de celular: seus registros ficam salvos no SQLite e sincronizam depois.'
  },
  {
    icon: FileText,
    title: '5. Laudos, Relatórios e Prescrições',
    description: 'Emita relatórios completos em PDF com assinatura digital, carimbo de tempo e rastreabilidade técnica.'
  }
];

export function OnboardingModal({
  visible,
  onFinish
}: {
  visible: boolean;
  onFinish: () => void;
}) {
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
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={styles.container}>
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
    maxWidth: 380,
    alignItems: 'center',
    gap: 16,
  },
  brand: { fontFamily: fonts.brand, fontSize: 36, color: c.red, letterSpacing: -1 },
  subtitle: { fontFamily: fonts.semibold, fontSize: 16, color: c.text, textAlign: 'center' },
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
  stepTitle: { fontFamily: fonts.semibold, fontSize: 18, textAlign: 'center', color: c.text },
  stepDesc: { fontSize: 14, lineHeight: 20, textAlign: 'center', color: c.secondary },
  dotsRow: { flexDirection: 'row', gap: 6, marginVertical: 8 },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 24, backgroundColor: c.red },
  dotInactive: { width: 6, backgroundColor: c.border },
});
