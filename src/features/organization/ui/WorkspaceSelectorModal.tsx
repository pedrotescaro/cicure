import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions
} from 'react-native';
import { 
  Building2, 
  Check, 
  ChevronRight, 
  Plus, 
  Shield, 
  User, 
  Users, 
  X,
  KeyRound,
  Sparkles
} from 'lucide-react-native';
import { Badge, Button, Card, Divider, IconButton, Label, Txt, s } from '../../../ui/components';
import { colors as c, fonts } from '../../../ui/theme';
import { useStore } from '../../../data/store';
import type { Organization } from '../domain/types';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function WorkspaceSelectorModal({ visible, onClose }: Props) {
  const { width } = useWindowDimensions();
  const store = useStore();
  const { workMode, activeOrg, organizations, setWorkMode, createGroup, joinGroup } = store;

  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'join'>('list');

  // Form states for creating a group
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCnpj, setNewOrgCnpj] = useState('');
  const [newOrgPhone, setNewOrgPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for joining with a code
  const [inviteCode, setInviteCode] = useState('');

  const clinicOrgs = organizations.filter(o => !o.isIndividual);

  const handleSelectIndividual = async () => {
    try {
      await setWorkMode('individual');
      onClose();
    } catch {
      Alert.alert('Erro', 'Não foi possível alternar para o modo individual.');
    }
  };

  const handleSelectGroup = async (orgId: string) => {
    try {
      await setWorkMode('group', orgId);
      onClose();
    } catch {
      Alert.alert('Erro', 'Não foi possível alternar de clínica.');
    }
  };

  const handleCreateGroup = async () => {
    if (!newOrgName.trim()) {
      Alert.alert('Campo Obrigatório', 'Informe o nome da clínica ou grupo.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createGroup(newOrgName, newOrgCnpj, newOrgPhone);
      Alert.alert(
        'Clínica Criada com Sucesso!',
        `A clínica "${created.name}" foi criada.\n\nCódigo de convite para sua equipe: ${created.inviteCode || 'Disponível nas configurações'}`
      );
      setNewOrgName('');
      setNewOrgCnpj('');
      setNewOrgPhone('');
      setActiveTab('list');
      onClose();
    } catch {
      Alert.alert('Erro ao Criar', 'Não foi possível criar a organização no momento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Código Obrigatório', 'Digite o código de convite da clínica (ex: CIC-8241).');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await joinGroup(inviteCode);
      if (result.success) {
        Alert.alert('Sucesso!', result.message);
        setInviteCode('');
        setActiveTab('list');
        onClose();
      } else {
        Alert.alert('Não foi possível entrar', result.message);
      }
    } catch {
      Alert.alert('Erro ao Entrar', 'Ocorreu uma falha ao validar o código.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { maxHeight: '90%' }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt style={styles.sheetTitle}>
                {activeTab === 'list' && 'Alternar Workspace'}
                {activeTab === 'create' && 'Nova Clínica ou Grupo'}
                {activeTab === 'join' && 'Entrar em uma Clínica'}
              </Txt>
              <Txt muted style={{ fontSize: 13 }}>
                {activeTab === 'list' && 'Escolha entre prática individual ou equipe'}
                {activeTab === 'create' && 'Cadastre sua clínica e convide outros profissionais'}
                {activeTab === 'join' && 'Use o código de convite fornecido pelo administrador'}
              </Txt>
            </View>
            <IconButton icon={X} label="Fechar" onPress={onClose} />
          </View>

          <ScrollView 
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'list' && (
              <View style={{ gap: 18 }}>
                {/* Modo Individual */}
                <View style={{ gap: 8 }}>
                  <Label>PRÁTICA AUTÔNOMA (INDIVIDUAL)</Label>
                  <Pressable 
                    onPress={handleSelectIndividual}
                    style={[
                      styles.modeCard,
                      workMode === 'individual' && styles.activeModeCard
                    ]}
                  >
                    <View style={[styles.avatar, workMode === 'individual' && { backgroundColor: c.dark }]}>
                      <User size={22} color={workMode === 'individual' ? '#FFF' : c.text} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Txt style={[styles.cardTitle, { flexShrink: 1 }]} numberOfLines={1}>Consultório Individual</Txt>
                        {workMode === 'individual' ? (
                          <Badge tone="green">Ativo</Badge>
                        ) : null}
                      </View>
                      <Txt muted style={{ fontSize: 12 }} numberOfLines={2}>
                        Prontuários e dados 100% privados e isolados para sua prática autônoma.
                      </Txt>
                    </View>
                    {workMode === 'individual' ? (
                      <Check size={20} color={c.green} />
                    ) : (
                      <ChevronRight size={18} color={c.secondary} />
                    )}
                  </Pressable>
                </View>

                {/* Modo Grupo / Clínicas */}
                <View style={{ gap: 8 }}>
                  <View style={s.between}>
                    <Label>CLÍNICAS E EQUIPES ({clinicOrgs.length})</Label>
                    <Txt muted style={{ fontSize: 11 }}>Compartilhado com RLS</Txt>
                  </View>

                  {clinicOrgs.map(org => {
                    const isSelected = workMode === 'group' && activeOrg.id === org.id;
                    return (
                      <Pressable 
                        key={org.id}
                        onPress={() => handleSelectGroup(org.id)}
                        style={[
                          styles.modeCard,
                          isSelected && styles.activeModeCard
                        ]}
                      >
                        <View style={[styles.avatar, isSelected && { backgroundColor: c.red }]}>
                          <Building2 size={22} color={isSelected ? '#FFF' : c.text} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Txt style={[styles.cardTitle, { flexShrink: 1 }]} numberOfLines={1}>{org.name}</Txt>
                            {isSelected ? (
                              <Badge tone="green">Ativo</Badge>
                            ) : null}
                          </View>
                          <Txt muted style={{ fontSize: 12 }}>
                            {Boolean(org.inviteCode) ? `Código: ${org.inviteCode} · ` : ''}
                            {org.membersCount || 1} membro(s)
                          </Txt>
                        </View>
                        {isSelected ? (
                          <Check size={20} color={c.green} />
                        ) : (
                          <ChevronRight size={18} color={c.secondary} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                {/* Ações de Criação e Entrada */}
                <Divider />
                <View style={{ gap: 10 }}>
                  <Button 
                    title="Criar Nova Clínica / Grupo" 
                    variant="outline" 
                    icon={Plus} 
                    onPress={() => setActiveTab('create')} 
                  />
                  <Button 
                    title="Entrar com Código de Convite" 
                    variant="outline" 
                    icon={KeyRound} 
                    onPress={() => setActiveTab('join')} 
                  />
                </View>
              </View>
            )}

            {activeTab === 'create' && (
              <View style={{ gap: 14 }}>
                <Card style={{ backgroundColor: '#FDF7F7', borderColor: '#F5C6C6', gap: 6 }}>
                  <Txt style={{ fontFamily: fonts.semibold, fontSize: 13, color: c.red }}>Criando Espaço de Trabalho Compartilhado</Txt>
                  <Txt muted style={{ fontSize: 12, lineHeight: 17 }}>
                    Você será o Administrador desta clínica. Um código de convite único será gerado para que outros profissionais e assistentes possam ingressar.
                  </Txt>
                </Card>

                <View style={styles.fieldBlock}>
                  <Label>Nome da Clínica ou Equipe *</Label>
                  <TextInput 
                    style={styles.input}
                    placeholder="Ex: Clínica Cicatrizar & Saúde Vascular"
                    placeholderTextColor={c.secondary}
                    value={newOrgName}
                    onChangeText={setNewOrgName}
                    autoFocus
                  />
                </View>

                <View style={styles.fieldBlock}>
                  <Label>CNPJ (Opcional)</Label>
                  <TextInput 
                    style={styles.input}
                    placeholder="00.000.000/0001-00"
                    placeholderTextColor={c.secondary}
                    value={newOrgCnpj}
                    onChangeText={setNewOrgCnpj}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.fieldBlock}>
                  <Label>Telefone / WhatsApp de Contato</Label>
                  <TextInput 
                    style={styles.input}
                    placeholder="(11) 99999-9999"
                    placeholderTextColor={c.secondary}
                    value={newOrgPhone}
                    onChangeText={setNewOrgPhone}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={{ gap: 10, marginTop: 10 }}>
                  <Button 
                    title="Salvar e Ativar Clínica" 
                    variant="primary" 
                    loading={isSubmitting}
                    onPress={handleCreateGroup} 
                  />
                  <Button 
                    title="Voltar" 
                    variant="outline" 
                    onPress={() => setActiveTab('list')} 
                  />
                </View>
              </View>
            )}

            {activeTab === 'join' && (
              <View style={{ gap: 14 }}>
                <Card style={{ backgroundColor: '#F8F9FA', gap: 6 }}>
                  <Txt style={{ fontFamily: fonts.semibold, fontSize: 13 }}>Como funciona o código de convite</Txt>
                  <Txt muted style={{ fontSize: 12, lineHeight: 17 }}>
                    Peça ao administrador da clínica o código no formato <Txt style={{ fontFamily: fonts.semibold }}>CIC-XXXX</Txt>. Ao entrar, você terá acesso aos prontuários compartilhados dessa unidade.
                  </Txt>
                </Card>

                <View style={styles.fieldBlock}>
                  <Label>Código de Convite da Clínica *</Label>
                  <TextInput 
                    style={[styles.input, { letterSpacing: 2, textTransform: 'uppercase', fontSize: 18, textAlign: 'center' }]}
                    placeholder="CIC-8241"
                    placeholderTextColor={c.secondary}
                    value={inviteCode}
                    onChangeText={t => setInviteCode(t.toUpperCase())}
                    autoFocus
                  />
                </View>

                <View style={{ gap: 10, marginTop: 10 }}>
                  <Button 
                    title="Validar e Entrar na Equipe" 
                    variant="primary" 
                    loading={isSubmitting}
                    onPress={handleJoinGroup} 
                  />
                  <Button 
                    title="Voltar" 
                    variant="outline" 
                    onPress={() => setActiveTab('list')} 
                  />
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.border
  },
  sheetTitle: {
    fontFamily: fonts.brand,
    fontSize: 20
  },
  content: {
    padding: 20,
    gap: 16
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: '#EFEFEF',
    gap: 12
  },
  activeModeCard: {
    backgroundColor: '#FFF8F8',
    borderColor: c.red
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EAEAEA',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15
  },
  fieldBlock: {
    gap: 6
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 14
  }
});
