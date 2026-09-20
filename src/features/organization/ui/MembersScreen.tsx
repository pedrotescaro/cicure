import React, { useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, UserPlus, Shield, Mail, Check, X } from 'lucide-react-native';
import { Badge, Button, Card, Choices, Empty, Field, IconButton, Label, SectionTitle, Txt, s } from '../../../ui/components';
import { colors as c, fonts } from '../../../ui/theme';
import { DEFAULT_MEMBERS, inviteMember } from '../domain/organization.service';
import type { OrganizationMember, OrganizationRole } from '../domain/types';

export default function MembersScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<OrganizationMember[]>(DEFAULT_MEMBERS);
  const [modalVisible, setModalVisible] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizationRole>('Profissional');

  const handleInvite = () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Dados Incompletos', 'Informe o nome e e-mail do profissional convidado.');
      return;
    }
    const newMember = inviteMember('org-clinica-cicatrizar', name.trim(), email.trim(), role);
    setMembers(prev => [...prev, newMember]);
    setModalVisible(false);
    setName('');
    setEmail('');
    Alert.alert('Convite Enviado', `Um convite com acesso de nível "${role}" foi enviado para ${email}.`);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Voltar" onPress={() => router.back()} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={styles.headerTitle}>Equipe da Clínica</Txt>
          <Txt muted style={{ fontSize: 13 }}>Membros, papéis e permissões granulares</Txt>
        </View>
        <IconButton 
          icon={UserPlus} 
          label="Convidar Membro" 
          onPress={() => setModalVisible(true)} 
          color={c.red} 
        />
      </View>

      <FlatList
        data={members}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <Card style={{ backgroundColor: '#FAFAFA', gap: 6, marginBottom: 12 }}>
            <Txt style={{ fontFamily: fonts.semibold, fontSize: 14 }}>Acesso Granular ao Prontuário</Txt>
            <Txt muted style={{ fontSize: 12, lineHeight: 18 }}>
              Nem todos os membros da clínica têm acesso irrestrito a todos os pacientes. O prontuário só é visível se houver associação explícita na equipe de atendimento.
            </Txt>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={styles.memberCard}>
            <View style={s.between}>
              <View style={{ flex: 1, gap: 3 }}>
                <Txt style={styles.memberName}>{item.name}</Txt>
                <Txt muted style={{ fontSize: 12 }}>{item.email}</Txt>
              </View>
              <Badge tone={item.role === 'Administrador' ? 'red' : item.role === 'Profissional' ? 'green' : 'neutral'}>
                {item.role}
              </Badge>
            </View>

            <View style={styles.cardFooter}>
              <Txt muted style={{ fontSize: 11 }}>
                Status: {item.status === 'active' ? 'Ativo na clínica' : 'Convite pendente'}
              </Txt>
              <Txt muted style={{ fontSize: 11 }}>Desde {item.invitedAt}</Txt>
            </View>
          </Card>
        )}
      />

      {/* Modal Convidar Membro */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={s.between}>
              <Txt style={{ fontFamily: fonts.brand, fontSize: 20 }}>Convidar Profissional</Txt>
              <IconButton icon={X} label="Fechar" onPress={() => setModalVisible(false)} />
            </View>

            <Field 
              label="Nome do Profissional" 
              placeholder="Ex.: Dra. Juliana Mendes" 
              value={name} 
              onChangeText={setName} 
            />

            <Field 
              label="E-mail Institucional" 
              keyboardType="email-address" 
              placeholder="Ex.: juliana@clinica.com.br" 
              value={email} 
              onChangeText={setEmail} 
            />

            <View style={{ gap: 6 }}>
              <Label>Papel e Nível de Permissão</Label>
              <Choices 
                options={['Administrador', 'Profissional', 'Assistente', 'Somente leitura']} 
                value={role} 
                onChange={v => setRole(v as OrganizationRole)} 
              />
            </View>

            <Button 
              title="Enviar Convite de Acesso" 
              icon={Check} 
              onPress={handleInvite} 
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
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
  content: { padding: 16, gap: 10, paddingBottom: 100 },
  memberCard: { gap: 10, marginBottom: 8 },
  memberName: { fontFamily: fonts.semibold, fontSize: 15, color: c.text },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: c.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    gap: 16,
  },
});
