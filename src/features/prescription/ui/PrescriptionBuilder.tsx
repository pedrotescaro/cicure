import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
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

export default function PrescriptionBuilder({
  patientId,
  woundId,
}: {
  patientId: string;
  woundId?: string;
}) {
  const router = useRouter();

  const patient = useStore(st => st.data.patients.find(p => p.id === patientId));
  const wounds = useStore(st => st.data.wounds.filter(w => w.patientId === patientId));
  const selectedWound = wounds.find(w => w.id === woundId) || wounds[0];
  const profile = useStore(st => st.data.profiles[0]);

  // Estados dos campos
  const [cleaning, setCleaning] = useState('');
  const [solution, setSolution] = useState('');
  const [primaryCoverage, setPrimaryCoverage] = useState('');
  const [secondaryCoverage, setSecondaryCoverage] = useState('');
  const [fixation, setFixation] = useState('');
  const [perilesionalProtection, setPerilesionalProtection] = useState('');
  const [changeFrequency, setChangeFrequency] = useState('');
  const [expectedDuration, setExpectedDuration] = useState('');
  const [observations, setObservations] = useState('');
  const isSigned = false;

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

  const handlePrintPDF = async () => {
    Alert.alert('Exportação indisponível', 'A prescrição ainda não possui assinatura e persistência verificadas.');
  };

  const handleSaveAsTemplate = () => {
    Alert.alert(
      'Salvar como Template',
      'Templates clínicos ainda não possuem persistência nesta versão.'
    );
  };

  const handleSavePrescription = () => {
    Alert.alert('Salvamento indisponível', 'A prescrição ainda não é salva no prontuário. Nenhum documento foi emitido.');
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
                  {profile?.name || 'Não informado'} · {profile?.council || 'Não informado'} {profile?.registration || 'Não informado'}
                </Txt>
              </View>
            </View>
          </View>

          <Button 
            title={isSigned ? 'Assinatura Registrada' : 'Assinar Prescrição'} 
            variant={isSigned ? 'outline' : 'primary'} 
            icon={Check} 
            onPress={() => Alert.alert('Assinatura indisponível', 'A assinatura profissional ainda não foi integrada.')}
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
