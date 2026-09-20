import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Sparkles, Check, FileCheck, ShieldAlert } from 'lucide-react-native';
import { Accordion, Badge, Button, Card, Field, Label, SectionTitle, Txt, s } from '../../../ui/components';
import { fonts, useTheme } from '../../../ui/theme';
import type { Patient, Wound, Visit } from '../../../domain/types';
import type { SOAPNote, SOAPStatus } from '../domain/types';
import { generateSOAPDraft } from '../domain/soap.service';

export default function SOAPEditor({
  visit,
  patient,
  wound,
  onSave
}: {
  visit: Visit;
  patient: Patient;
  wound: Wound;
  onSave?: (soap: SOAPNote) => void;
}) {
  const { colors } = useTheme();
  const [soap, setSoap] = useState<SOAPNote>(() => generateSOAPDraft(visit, patient, wound));
  const [hasReviewed, setHasReviewed] = useState(false);

  const handleGenerateDraft = () => {
    const draft = generateSOAPDraft(visit, patient, wound);
    setSoap(draft);
    setHasReviewed(false);
    Alert.alert(
      'Rascunho SOAP Gerado',
      'O rascunho foi preenchido com as informações registradas nesta consulta. Por favor, revise cada seção antes de confirmar o salvamento definitivo.'
    );
  };

  const handleConfirmSOAP = () => {
    if (!soap.subjective || !soap.objective || !soap.assessment || !soap.plan) {
      Alert.alert('Campos Incompletos', 'Preencha ou revise todas as 4 dimensões do SOAP antes de confirmar.');
      return;
    }
    const confirmed: SOAPNote = {
      ...soap,
      status: 'Confirmado',
      confirmedAt: new Date().toISOString(),
      confirmedBy: 'Profissional autenticado',
      updatedAt: new Date().toISOString()
    };
    setSoap(confirmed);
    setHasReviewed(true);
    if (onSave) onSave(confirmed);
    Alert.alert('Evolução SOAP Confirmada', 'A nota clínica foi validada pelo profissional e integrada ao atendimento.');
  };

  return (
    <Card style={styles.card}>
      <View style={s.between}>
        <View style={s.row}>
          <FileCheck size={20} color={colors.red} />
          <Txt style={styles.title}>Evolução no Modelo SOAP</Txt>
        </View>
        <Badge tone={soap.status === 'Confirmado' ? 'green' : 'amber'}>
          {soap.status}
        </Badge>
      </View>

      <Txt muted style={{ fontSize: 13, lineHeight: 18 }}>
        O modelo SOAP é opcional e coexiste com o fluxo estruturado do Cicure. Você pode gerar um rascunho automático e deve revisar obrigatoriamente antes de confirmar.
      </Txt>

      {/* Botão Gerar Rascunho */}
      <Button 
        title="Gerar rascunho a partir do atendimento" 
        icon={Sparkles} 
        variant="outline" 
        small 
        onPress={handleGenerateDraft} 
      />

      {/* S - Subjetivo */}
      <View style={styles.soapSection}>
        <View style={s.row}>
          <View style={[styles.letterTag, { backgroundColor: '#3B82F6' }]}>
            <Txt style={styles.letterText}>S</Txt>
          </View>
          <Txt style={styles.sectionLabel}>Subjetivo (Relato do paciente, queixas, dor)</Txt>
        </View>
        <Field 
          label="" 
          multiline 
          value={soap.subjective} 
          onChangeText={val => setSoap(prev => ({ ...prev, subjective: val, status: 'Revisado' }))} 
          placeholder="Descreva as queixas e percepções do paciente..." 
        />
      </View>

      {/* O - Objetivo */}
      <View style={styles.soapSection}>
        <View style={s.row}>
          <View style={[styles.letterTag, { backgroundColor: '#10B981' }]}>
            <Txt style={styles.letterText}>O</Txt>
          </View>
          <Txt style={styles.sectionLabel}>Objetivo (Exame físico, medidas, tecidos, exsudato)</Txt>
        </View>
        <Field 
          label="" 
          multiline 
          value={soap.objective} 
          onChangeText={val => setSoap(prev => ({ ...prev, objective: val, status: 'Revisado' }))} 
          placeholder="Descreva os achados clínicos objetivos..." 
        />
      </View>

      {/* A - Avaliação */}
      <View style={styles.soapSection}>
        <View style={s.row}>
          <View style={[styles.letterTag, { backgroundColor: '#F59E0B' }]}>
            <Txt style={styles.letterText}>A</Txt>
          </View>
          <Txt style={styles.sectionLabel}>Avaliação (Diagnóstico diferencial, escalas, estagnação)</Txt>
        </View>
        <Field 
          label="" 
          multiline 
          value={soap.assessment} 
          onChangeText={val => setSoap(prev => ({ ...prev, assessment: val, status: 'Revisado' }))} 
          placeholder="Análise do curso da cicatrização..." 
        />
      </View>

      {/* P - Plano */}
      <View style={styles.soapSection}>
        <View style={s.row}>
          <View style={[styles.letterTag, { backgroundColor: colors.red }]}>
            <Txt style={styles.letterText}>P</Txt>
          </View>
          <Txt style={styles.sectionLabel}>Plano (Conduta, curativos, encaminhamentos, retorno)</Txt>
        </View>
        <Field 
          label="" 
          multiline 
          value={soap.plan} 
          onChangeText={val => setSoap(prev => ({ ...prev, plan: val, status: 'Revisado' }))} 
          placeholder="Prescrição de condutas e orientações terapêuticas..." 
        />
      </View>

      {/* Ação de Confirmação Obrigatória */}
      <Button 
        title={soap.status === 'Confirmado' ? 'Evolução SOAP Confirmada' : 'Revisar e Confirmar SOAP'} 
        icon={Check} 
        variant={soap.status === 'Confirmado' ? 'outline' : 'primary'} 
        onPress={handleConfirmSOAP} 
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  title: { fontFamily: fonts.semibold, fontSize: 16 },
  soapSection: { gap: 6, paddingTop: 4 },
  sectionLabel: { fontFamily: fonts.medium, fontSize: 13 },
  letterTag: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: { color: '#FFF', fontFamily: fonts.bold, fontSize: 13 },
});
