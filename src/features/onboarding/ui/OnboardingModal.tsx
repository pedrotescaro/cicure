import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import {
  UserPlus,
  HeartPulse,
  Camera,
  RefreshCw,
  FileText,
  ChevronRight,
  Check
} from 'lucide-react-native';
import { Button, Card, Txt } from '../../../ui/components';
import { useTheme, type ColorPalette, fonts } from '../../../ui/theme';
import { useMotionPreferences } from '../../../ui/useMotionPreferences';

const ONBOARDING_STEPS = [
  {
    icon: UserPlus,
    title: 'Comece por Pacientes',
    description: 'Toque em Novo paciente para cadastrar. No prontuário, você pode editar os dados e cadastrar cada ferida separadamente.'
  },
  {
    icon: HeartPulse,
    title: 'Uma ferida, um acompanhamento',
    description: 'Escolha a ferida no prontuário para ver seu histórico. Ao tocar em Atender esta ferida, a localização acompanha o preenchimento.'
  },
  {
    icon: Camera,
    title: 'Registre o atendimento',
    description: 'Use Novo atendimento para preencher as etapas e adicionar fotos. Salve um rascunho para retomar depois. Revise os dados antes de concluir.'
  },
  {
    icon: RefreshCw,
    title: 'Use mesmo sem internet',
    description: 'Depois de entrar na conta, os registros ficam salvos neste aparelho. Em Menu, toque em Envio de dados para acompanhar os envios quando houver conexão.'
  },
  {
    icon: FileText,
    title: 'Agenda e relatórios',
    description: 'Na Agenda, marque atendimentos e consulte os retornos. Em Relatórios, escolha um atendimento registrado para gerar e compartilhar o documento.'
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
  const { reduceMotion } = useMotionPreferences();
  const styles = makeStyles(c);
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
    <Modal visible={visible} animationType={reduceMotion ? 'none' : 'fade'} transparent={false} onShow={() => { setStep(0); onShow?.(); }} onRequestClose={onFinish}>
      <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <Txt style={styles.brand}>cicure</Txt>
          <Txt style={styles.subtitle}>Como usar o Cicure</Txt>
          <Txt muted accessibilityLiveRegion="polite">Passo {step + 1} de {ONBOARDING_STEPS.length}</Txt>

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
            title={step === ONBOARDING_STEPS.length - 1 ? 'Começar a usar o Cicure' : 'Próximo passo'}
            icon={step === ONBOARDING_STEPS.length - 1 ? Check : ChevronRight}
            onPress={handleNext}
            style={{ width: '100%', minHeight: 52 }}
          />
          {step > 0 && <Button title="Passo anterior" variant="outline" onPress={() => setStep(value => value - 1)} style={{ width: '100%' }} />}
          {step < ONBOARDING_STEPS.length - 1 && <Button title="Ver depois" variant="ghost" onPress={onFinish} />}
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
  stepDesc: { fontSize: 16, lineHeight: 24, textAlign: 'center', color: c.secondary },
  dotsRow: { flexDirection: 'row', gap: 6, marginVertical: 8 },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 24, backgroundColor: c.red },
  dotInactive: { width: 6, backgroundColor: c.border },
});
