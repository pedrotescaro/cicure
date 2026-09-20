import React, { useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, UserPlus, Shield, Mail, Check, X } from 'lucide-react-native';
import { Badge, Button, Card, Choices, Empty, Field, IconButton, Label, SectionTitle, Txt, safeBack, s } from '../../../ui/components';
import { fonts, useTheme } from '../../../ui/theme';
import { DEFAULT_MEMBERS, inviteMember } from '../domain/organization.service';
import type { OrganizationMember, OrganizationRole } from '../domain/types';

export default function MembersScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 640;
  const { colors: c, isDark } = useTheme();
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
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <IconButton icon={ChevronLeft} label="Voltar" onPress={() => safeBack(router, '/organization')} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={[styles.headerTitle, { color: c.text }]}>Equipe & Permissões</Txt>
          <Txt muted style={{ fontSize: 13 }}>Membros da Clínica Cicatrizar</Txt>
        </View>
        <IconButton 
          icon={Plus} 
          label="Convidar" 
          color={c.red}
          onPress={() => setModalVisible(true)} 
        />
      </View>

      <FlatList
        data={members}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <Card style={styles.memberCard}>
            <View style={s.between}>
              <View style={s.row}>
                <View style={{ gap: 2 }}>
                  <Txt style={styles.memberName}>{item.name}</Txt>
                  <Txt muted style={{ fontSize: 13 }}>{item.email}</Txt>
                </View>
              </View>

              <Badge tone={item.role === 'Administrador' ? 'green' : 'neutral'}>
                {item.role}
              </Badge>
            </View>

            <View style={[styles.cardFooter, { borderTopColor: c.border }]}>
              <Txt muted style={{ fontSize: 11 }}>Status: {item.status.toUpperCase()}</Txt>
              <Txt muted style={{ fontSize: 11 }}>Desde {item.invitedAt.slice(0, 10)}</Txt>
            </View>
          </Card>
        )}
      />

      {/* Modal Convidar Membro */}
      <Modal visible={modalVisible} animationType={isDesktop ? 'fade' : 'slide'} transparent onRequestClose={() => setModalVisible(false)}>
        <View 
          style={[
            styles.modalOverlay,
            {
              backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)',
              justifyContent: isDesktop ? 'center' : 'flex-end',
              alignItems: isDesktop ? 'center' : 'stretch',
              padding: isDesktop ? 20 : 0,
            }
          ]}
        >
          <View 
            style={[
              styles.modalContent, 
              { 
                backgroundColor: c.surface,
                borderRadius: isDesktop ? 28 : 0,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                width: isDesktop ? '100%' : undefined,
                maxWidth: isDesktop ? 540 : undefined,
                borderWidth: isDesktop && isDark ? 1 : 0,
                borderColor: c.border,
              }
            ]}
          >
            <View style={s.between}>
              <Txt style={{ fontFamily: fonts.brand, fontSize: 20, color: c.text }}>Convidar Profissional</Txt>
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
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: fonts.brand, fontSize: 22 },
  content: { padding: 16, gap: 10, paddingBottom: 100, width: '100%', maxWidth: 840, alignSelf: 'center' },
  memberCard: { gap: 10, marginBottom: 8 },
  memberName: { fontFamily: fonts.semibold, fontSize: 15 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  modalOverlay: {
    flex: 1,
  },
  modalContent: {
    padding: 20,
    gap: 16,
  },
});
