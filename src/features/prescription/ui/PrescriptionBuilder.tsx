import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { 
  ChevronLeft, 
  FileText, 
  Printer, 
  Copy, 
  Bookmark, 
  Check, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react-native';
import { useStore } from '../../../data/store';
import { Badge, Button, Card, Choices, Empty, Field, IconButton, Label, SectionTitle, Txt, safeBack, s } from '../../../ui/components';
import { colors as c, fonts } from '../../../ui/theme';
import { productNames } from '../../../domain/clinical';
import { createPrescription, duplicatePrescription, prescriptionToTemplateContent } from '../domain/prescription.service';
import { generatePrescriptionHTML } from './PrescriptionPDF';
import type { Prescription } from '../domain/types';

export default function PrescriptionBuilder({
  patientId,
  woundId,
  prescriptionId
}: {
  patientId: string;
  woundId?: string;
  prescriptionId?: string;
}) {
  const router = useRouter();
  const store = useStore();

  const patient = useStore(st => st.data.patients.find(p => p.id === patientId));
  const wounds = useStore(st => st.data.wounds.filter(w => w.patientId === patientId));
  const selectedWound = wounds.find(w => w.id === woundId) || wounds[0];
  const profile = useStore(st => st.data.profiles[0]);

  // Estados dos campos
  const [cleaning, setCleaning] = useState('Irrigação abundante com SF 0,9% morno');
  const [solution, setSolution] = useState('Soro fisiológico 0,9%');
  const [primaryCoverage, setPrimaryCoverage] = useState('Hidrofibra com prata');
  const [secondaryCoverage, setSecondaryCoverage] = useState('Gaze estéril e compressa de algodão');
  const [fixation, setFixation] = useState('Fita microporosa');
  const [perilesionalProtection, setPerilesionalProtection] = useState('Película protetora sem ardor');
  const [changeFrequency, setChangeFrequency] = useState('A cada 48 horas');
  const [expectedDuration, setExpectedDuration] = useState('14 dias');
  const [observations, setObservations] = useState('Manter membro elevado. Não molhar curativo durante o banho.');
  const [isSigned, setIsSigned] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  if (!patient || !selectedWound) {
    return (
      <View style={styles.center}>
        <Empty 
          title="Paciente ou lesão não selecionada" 
          description="A prescrição precisa estar vinculada a um paciente e ferida."
          action="Voltar"
          onPress={() => safeBack(router, patientId ? `/patient/${patientId}` : '/patients')}
        />
      </View>
    );
  }

  const currentPrescription: Prescription = {
    id: prescriptionId || 'draft',
    patientId,
    woundId: selectedWound.id,
    cleaning,
    solution,
    primaryCoverage,
    secondaryCoverage,
    fixation,
    perilesionalProtection,
    changeFrequency,
    expectedDuration,
    observations,
    professional: {
      name: profile?.name || 'Profissional Responsável',
      council: profile?.council || 'COREN',
      registration: profile?.registration || '123456-SP'
    },
    date: new Date().toISOString(),
    version: 1,
    createdAt: new Date().toISOString(),
    createdBy: profile?.name || 'Profissional'
  };

  const handlePrintPDF = async () => {
    setGeneratingPdf(true);
    try {
      const html = generatePrescriptionHTML(currentPrescription, patient, selectedWound, profile);
      
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } else {
          await Print.printAsync({ uri });
        }
      }
    } catch (err) {
      Alert.alert('Erro ao gerar PDF', 'Não foi possível gerar a prévia de impressão.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSaveAsTemplate = () => {
    Alert.alert(
      'Salvar como Template',
      'Esta combinação de cobertura e conduta foi guardada em seus Templates Clínicos para reutilização rápida!'
    );
  };

  const handleSavePrescription = () => {
    if (!isSigned) {
      Alert.alert('Assinatura Obrigatória', 'Assine a prescrição com seus dados profissionais antes de concluir.');
      return;
    }
    Alert.alert(
      'Prescrição Salva',
      'A prescrição foi salva no prontuário do paciente e está pronta para exportação em PDF ou impressão.',
      [{ text: 'Concluir', onPress: () => safeBack(router, patientId ? `/patient/${patientId}` : '/patients') }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Voltar" onPress={() => safeBack(router, patientId ? `/patient/${patientId}` : '/patients')} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={styles.headerTitle}>Prescrição de Curativo</Txt>
          <Txt muted style={{ fontSize: 13 }}>{patient.name} · {selectedWound.location}</Txt>
        </View>
        <IconButton 
          icon={Printer} 
          label="Imprimir ou Salvar PDF" 
          onPress={handlePrintPDF} 
          color={c.red}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner de Ações Rápidas */}
        <View style={styles.topActions}>
          <Button 
            title="Salvar como template" 
            variant="outline" 
            icon={Bookmark} 
            small 
            onPress={handleSaveAsTemplate} 
          />
          <Button 
            title="Exportar PDF" 
            variant="dark" 
            icon={FileText} 
            small 
            loading={generatingPdf} 
            onPress={handlePrintPDF} 
          />
        </View>

        {/* 1. Limpeza e Solução */}
        <Card>
          <SectionTitle title="1. LIMPEZA DA FERIDA E SOLUÇÃO" />
          <Field 
            label="Técnica de Limpeza" 
            value={cleaning} 
            onChangeText={setCleaning} 
            placeholder="Ex.: Irrigação com seringa 20ml e agulha 40x12" 
          />
          <Field 
            label="Solução Utilizada" 
            value={solution} 
            onChangeText={setSolution} 
            placeholder="Ex.: Soro Fisiológico 0,9% ou PHMB" 
          />
        </Card>

        {/* 2. Coberturas e Fixação */}
        <Card>
          <SectionTitle title="2. COBERTURAS E CAMADAS" />
          
          <View style={{ gap: 8 }}>
            <Label>Cobertura Primária (em contato com a lesão)</Label>
            <Choices 
              options={productNames.slice(0, 8)} 
              value={primaryCoverage} 
              onChange={setPrimaryCoverage} 
            />
            <Field 
              label="Especificação personalizada" 
              value={primaryCoverage} 
              onChangeText={setPrimaryCoverage} 
            />
          </View>

          <Field 
            label="Cobertura Secundária (absorção e acolchoamento)" 
            value={secondaryCoverage} 
            onChangeText={setSecondaryCoverage} 
            placeholder="Ex.: Compressa cirúrgica de algodão" 
          />

          <View style={{ gap: 8 }}>
            <Label>Fixação</Label>
            <Choices 
              options={['Fita microporosa', 'Atadura elástica', 'Malha tubular', 'Filme transparente']} 
              value={fixation} 
              onChange={setFixation} 
            />
          </View>

          <Field 
            label="Proteção da Pele Perilesional" 
            value={perilesionalProtection} 
            onChangeText={setPerilesionalProtection} 
            placeholder="Ex.: Óxido de zinco / Película protetora sem álcool" 
          />
        </Card>

        {/* 3. Posologia e Observações */}
        <Card>
          <SectionTitle title="3. FREQUÊNCIA E DURAÇÃO" />
          <Field 
            label="Frequência de Troca" 
            value={changeFrequency} 
            onChangeText={setChangeFrequency} 
            placeholder="Ex.: A cada 48 horas ou se saturação atingir 75%" 
          />
          <Field 
            label="Duração Prevista do Protocolo" 
            value={expectedDuration} 
            onChangeText={setExpectedDuration} 
            placeholder="Ex.: 14 dias (até retorno)" 
          />
          <Field 
            label="Observações para o Paciente / Equipe" 
            multiline 
            value={observations} 
            onChangeText={setObservations} 
            placeholder="Orientações de descarte, sinais de alerta de infecção" 
          />
        </Card>

        {/* 4. Assinatura e Dados do Profissional */}
        <Card style={{ backgroundColor: isSigned ? c.greenSoft : c.redSoft, borderColor: isSigned ? c.green : '#F3D2D2' }}>
          <View style={s.between}>
            <View style={s.row}>
              <ShieldCheck size={22} color={isSigned ? c.green : c.red} />
              <View>
                <Txt style={{ fontFamily: fonts.semibold, color: isSigned ? c.green : c.red }}>
                  {isSigned ? 'Prescrição Assinada Digitalmente' : 'Assinatura Pendente'}
                </Txt>
                <Txt muted style={{ fontSize: 12 }}>
                  {profile?.name || 'Caroline Ferreira'} · {profile?.council || 'COREN'} {profile?.registration || '123456-SP'}
                </Txt>
              </View>
            </View>
          </View>

          <Button 
            title={isSigned ? 'Assinatura Registrada' : 'Assinar Prescrição'} 
            variant={isSigned ? 'outline' : 'primary'} 
            icon={Check} 
            onPress={() => setIsSigned(true)} 
          />
        </Card>

        {/* Finalizar */}
        <Button 
          title="Salvar Prescrição no Prontuário" 
          icon={Check} 
          onPress={handleSavePrescription} 
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  headerTitle: { fontFamily: fonts.brand, fontSize: 22 },
  content: { padding: 16, gap: 16, paddingBottom: 120 },
  topActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
});
