import React, { useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, Share2, ArrowUpRight, Check, X, Clock } from 'lucide-react-native';
import { useStore, uid } from '../../../data/store';
import { Badge, Button, Card, Choices, Empty, Field, IconButton, Label, SectionTitle, Txt, s } from '../../../ui/components';
import { colors as c, fonts } from '../../../ui/theme';
import { REFERRAL_SPECIALTIES, type Referral, type ReferralPriority, type ReferralStatus } from '../domain/types';

const STATUS_TONES: Record<ReferralStatus, 'neutral' | 'red' | 'green' | 'amber'> = {
  solicitado: 'amber',
  agendado: 'neutral',
  realizado: 'green',
  cancelado: 'red'
};

export default function ReferralsScreen({ patientId }: { patientId: string }) {
  const router = useRouter();
  const patient = useStore(st => st.data.patients.find(p => p.id === patientId));
  const wounds = useStore(st => st.data.wounds.filter(w => w.patientId === patientId));

  const [referrals, setReferrals] = useState<Referral[]>([
    {
      id: 'ref-1',
      patientId,
      woundId: wounds[0]?.id,
      specialty: 'Cirurgia Vascular',
      destinationService: 'Ambulatório de Cirurgia Vascular - Hospital Geral',
      reason: 'Avaliação de insuficiência arterial periférica e eco-Doppler arterial de membros inferiores.',
      observations: 'Pulsos distais não palpáveis no membro inferior esquerdo.',
      priority: 'Prioritário',
      status: 'solicitado',
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      createdBy: 'Caroline Ferreira'
    }
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [specialty, setSpecialty] = useState<string>('Cirurgia Vascular');
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [observations, setObservations] = useState('');
  const [priority, setPriority] = useState<ReferralPriority>('Prioritário');

  if (!patient) {
    return (
      <View style={styles.center}>
        <Empty title="Paciente não encontrado" description="Volte para a lista." action="Voltar" onPress={() => router.back()} />
      </View>
    );
  }

  const handleCreate = () => {
    if (!reason.trim() || !destination.trim()) {
      Alert.alert('Dados Incompletos', 'Informe o serviço/profissional de destino e o motivo do encaminhamento.');
      return;
    }
    const newRef: Referral = {
      id: uid(),
      patientId,
      woundId: wounds[0]?.id,
      specialty,
      destinationService: destination.trim(),
      reason: reason.trim(),
      observations: observations.trim(),
      priority,
      status: 'solicitado',
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      createdBy: 'Profissional autenticado'
    };

    setReferrals(prev => [newRef, ...prev]);
    setModalVisible(false);
    setDestination('');
    setReason('');
    setObservations('');
    Alert.alert('Encaminhamento Registrado', 'O encaminhamento foi anexado ao prontuário do paciente.');
  };

  const handleUpdateStatus = (id: string, newStatus: ReferralStatus) => {
    setReferrals(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Voltar" onPress={() => router.back()} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={styles.headerTitle}>Encaminhamentos</Txt>
          <Txt muted style={{ fontSize: 13 }}>{patient.name} · Especialidades e Serviços</Txt>
        </View>
        <IconButton 
          icon={Plus} 
          label="Novo Encaminhamento" 
          onPress={() => setModalVisible(true)} 
          color={c.red} 
        />
      </View>

      <FlatList
        data={referrals}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <Card style={styles.refCard}>
            <View style={s.between}>
              <Badge tone={item.priority === 'Urgente' ? 'red' : item.priority === 'Prioritário' ? 'amber' : 'neutral'}>
                {item.priority}
              </Badge>
              <Badge tone={STATUS_TONES[item.status]}>
                Status: {item.status.toUpperCase()}
              </Badge>
            </View>

            <View style={{ gap: 4 }}>
              <Txt style={styles.specialtyTitle}>{item.specialty}</Txt>
              <Txt muted style={{ fontSize: 13 }}>Destino: {item.destinationService}</Txt>
            </View>

            <View style={styles.boxReason}>
              <Txt style={{ fontFamily: fonts.medium, fontSize: 13 }}>Motivo Clínico:</Txt>
              <Txt style={{ fontSize: 13, lineHeight: 18 }}>{item.reason}</Txt>
              {item.observations ? (
                <Txt muted style={{ fontSize: 12, marginTop: 4 }}>Obs: {item.observations}</Txt>
              ) : null}
            </View>

            {/* Controle de Status */}
            <View style={styles.actionsBar}>
              <Txt muted style={{ fontSize: 11 }}>Alterar status:</Txt>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {(['solicitado', 'agendado', 'realizado', 'cancelado'] as ReferralStatus[]).map(st => (
                  <Button 
                    key={st}
                    title={st}
                    variant={item.status === st ? 'dark' : 'outline'}
                    small
                    onPress={() => handleUpdateStatus(item.id, st)}
                    style={{ minHeight: 32, paddingHorizontal: 10 }}
                  />
                ))}
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <Empty 
            title="Nenhum encaminhamento registrado" 
            description="Encaminhe o paciente para angiologia, infectologia, nutrição ou outras especialidades."
            action="Criar Encaminhamento"
            onPress={() => setModalVisible(true)}
          />
        }
      />

      {/* Modal Novo Encaminhamento */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={s.between}>
              <Txt style={{ fontFamily: fonts.brand, fontSize: 20 }}>Novo Encaminhamento</Txt>
              <IconButton icon={X} label="Fechar" onPress={() => setModalVisible(false)} />
            </View>

            <View style={{ gap: 6 }}>
              <Label>Especialidade de Destino</Label>
              <Choices 
                options={REFERRAL_SPECIALTIES as unknown as string[]} 
                value={specialty} 
                onChange={v => setSpecialty(v)} 
              />
            </View>

            <Field 
              label="Serviço / Profissional / Hospital" 
              placeholder="Ex.: Ambulatório de Angiologia HCFMUSP" 
              value={destination} 
              onChangeText={setDestination} 
            />

            <Field 
              label="Motivo do Encaminhamento" 
              multiline 
              placeholder="Justificativa clínica, hipótese diagnóstica e exames solicitados..." 
              value={reason} 
              onChangeText={setReason} 
            />

            <Field 
              label="Observações Adicionais" 
              value={observations} 
              onChangeText={setObservations} 
              placeholder="Ex.: Paciente com dificuldade de locomoção" 
            />

            <View style={{ gap: 6 }}>
              <Label>Prioridade Clínica</Label>
              <Choices 
                options={['Rotina', 'Prioritário', 'Urgente']} 
                value={priority} 
                onChange={v => setPriority(v as ReferralPriority)} 
              />
            </View>

            <Button 
              title="Registrar Encaminhamento" 
              icon={Check} 
              onPress={handleCreate} 
            />
          </View>
        </View>
      </Modal>
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
  headerTitle: { fontFamily: fonts.brand, fontSize: 22, color: c.text },
  content: { padding: 16, gap: 12, paddingBottom: 100 },
  refCard: { gap: 12, marginBottom: 8 },
  specialtyTitle: { fontFamily: fonts.semibold, fontSize: 16, color: c.text },
  boxReason: {
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    gap: 4,
  },
  actionsBar: { gap: 6, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: c.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    padding: 20,
    gap: 14,
  },
});
