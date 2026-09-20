import React, { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ChevronLeft, 
  Building2, 
  Users, 
  Plus, 
  Check, 
  Settings2, 
  Shield, 
  User, 
  KeyRound,
  Copy,
  Share2
} from 'lucide-react-native';
import { Badge, Button, Card, Divider, Empty, IconButton, Label, SectionTitle, Txt, safeBack, s } from '../../../ui/components';
import { fonts, useTheme } from '../../../ui/theme';
import { useStore } from '../../../data/store';
import { WorkspaceSelectorModal } from './WorkspaceSelectorModal';
import type { Organization } from '../domain/types';

export default function OrganizationScreen() {
  const router = useRouter();
  const store = useStore();
  const { workMode, activeOrg, organizations, setWorkMode } = store;
  const { colors: c, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const individualOrg = organizations.find(o => o.isIndividual);
  const clinicOrgs = organizations.filter(o => !o.isIndividual);

  const handleSelectIndividual = async () => {
    try {
      await setWorkMode('individual');
      Alert.alert('Modo Individual Ativado', 'Você agora está operando no seu Consultório Autônomo com prontuários privados.');
    } catch {
      Alert.alert('Erro', 'Não foi possível alternar para o modo individual.');
    }
  };

  const handleSelectGroup = async (org: Organization) => {
    try {
      await setWorkMode('group', org.id);
      Alert.alert('Workspace Alterado', `Você agora está operando no contexto de "${org.name}".`);
    } catch {
      Alert.alert('Erro', 'Não foi possível alternar de clínica.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <IconButton icon={ChevronLeft} label="Voltar" onPress={() => safeBack(router, '/more')} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={[styles.headerTitle, { color: c.text }]}>Clínicas e Workspaces</Txt>
          <Txt muted style={{ fontSize: 13 }}>Alterne entre seu consultório particular e equipes</Txt>
        </View>
        <IconButton 
          icon={Plus} 
          label="Nova Clínica" 
          color={c.red}
          onPress={() => setModalVisible(true)} 
        />
      </View>

      <FlatList
        data={clinicOrgs}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 8 }}>
            {/* Explicação de Isolamento */}
            <Card style={{ backgroundColor: isDark ? c.surfaceSubtle : '#FAFAFA', borderColor: c.border, gap: 6 }}>
              <View style={s.row}>
                <Shield size={18} color={isDark ? c.red : c.dark} />
                <Txt style={{ fontFamily: fonts.semibold, fontSize: 14 }}>Segurança & Isolamento de Dados</Txt>
              </View>
              <Txt muted style={{ fontSize: 12, lineHeight: 18 }}>
                O Cicure separa seus atendimentos particulares dos atendimentos das clínicas. 
                Tudo é salvo localmente no SQLite do aparelho para funcionar sem internet, e sincronizado automaticamente com a nuvem quando você se conectar.
              </Txt>
            </Card>

            {/* Bloco 1: Prática Autônoma / Individual */}
            <View style={{ gap: 8 }}>
              <Label>PRÁTICA AUTÔNOMA (INDIVIDUAL)</Label>
              <Card 
                style={[
                  styles.orgCard, 
                  workMode === 'individual' && {
                    borderColor: c.red,
                    backgroundColor: isDark ? c.redSoft : '#FFF8F8',
                  }
                ]}
              >
                <View style={s.between}>
                  <View style={s.row}>
                    <View 
                      style={[
                        styles.avatar, 
                        { 
                          backgroundColor: isDark 
                            ? (workMode === 'individual' ? '#333338' : c.surfaceSubtle) 
                            : (workMode === 'individual' ? c.dark : '#F0F0F0') 
                        }
                      ]}
                    >
                      <User 
                        size={22} 
                        color={workMode === 'individual' ? '#FFF' : c.secondary} 
                      />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Txt style={styles.orgName}>{individualOrg?.name || 'Consultório Individual (Autônomo)'}</Txt>
                      <Txt muted style={{ fontSize: 12 }}>
                        Prontuários exclusivos do seu exercício autônomo
                      </Txt>
                      <Txt muted style={{ fontSize: 12 }}>
                        1 profissional · Isolamento completo
                      </Txt>
                    </View>
                  </View>
                  {workMode === 'individual' ? (
                    <Badge tone="green">Ativo</Badge>
                  ) : null}
                </View>

                {workMode !== 'individual' ? (
                  <View style={[styles.cardActions, { borderTopColor: c.border }]}>
                    <Button 
                      title="Ativar Modo Individual" 
                      variant="dark" 
                      small 
                      onPress={handleSelectIndividual} 
                    />
                  </View>
                ) : null}
              </Card>
            </View>

            {/* Bloco 2: Clínicas & Grupos */}
            <View style={[s.between, { marginTop: 8 }]}>
              <Label>CLÍNICAS E EQUIPES MULTIDISCIPLINARES ({clinicOrgs.length})</Label>
              <Pressable onPress={() => setModalVisible(true)}>
                <Txt style={{ color: c.red, fontSize: 12, fontFamily: fonts.semibold }}>+ Participar / Criar</Txt>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const isCurrent = workMode === 'group' && activeOrg.id === item.id;
          return (
            <Card 
              style={[
                styles.orgCard, 
                isCurrent && {
                  borderColor: c.red,
                  backgroundColor: isDark ? c.redSoft : '#FFF8F8',
                }
              ]}
            >
              <View style={s.between}>
                <View style={s.row}>
                  <View 
                    style={[
                      styles.avatar, 
                      { backgroundColor: isDark ? c.surfaceSubtle : '#F0F0F0' },
                      isCurrent && { backgroundColor: c.red }
                    ]}
                  >
                    <Building2 size={22} color={isCurrent ? '#FFF' : c.secondary} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Txt style={styles.orgName}>{item.name}</Txt>
                    {Boolean(item.cnpj) ? <Txt muted style={{ fontSize: 12 }}>CNPJ: {item.cnpj}</Txt> : null}
                    {Boolean(item.inviteCode) ? (
                      <View style={[s.row, { gap: 6, marginTop: 2 }]}>
                        <Txt muted style={{ fontSize: 12 }}>Código de convite:</Txt>
                        <Badge tone="neutral">{item.inviteCode}</Badge>
                      </View>
                    ) : null}
                    <Txt muted style={{ fontSize: 12, marginTop: 2 }}>
                      {item.membersCount || 1} membro(s) · {item.patientsCount || 0} paciente(s)
                    </Txt>
                  </View>
                </View>
                {isCurrent ? (
                  <Badge tone="green">Ativo</Badge>
                ) : null}
              </View>

              <View style={[styles.cardActions, { borderTopColor: c.border }]}>
                <Button 
                  title="Equipe e Permissões" 
                  variant="outline" 
                  icon={Users} 
                  small 
                  onPress={() => router.push('/organization/members' as never)} 
                />
                {!isCurrent ? (
                  <Button 
                    title="Selecionar Clínica" 
                    variant="dark" 
                    small 
                    onPress={() => handleSelectGroup(item)} 
                  />
                ) : null}
              </View>
            </Card>
          );
        }}
        ListFooterComponent={
          <View style={{ marginTop: 12, gap: 10 }}>
            <Button 
              title="Alternar, Criar ou Entrar em Clínica" 
              variant="outline" 
              icon={Building2}
              onPress={() => setModalVisible(true)} 
            />
          </View>
        }
      />

      <WorkspaceSelectorModal 
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
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
  content: { padding: 16, gap: 12, paddingBottom: 100, width: '100%', maxWidth: 840, alignSelf: 'center' },
  orgCard: { gap: 12, marginBottom: 8 },
  orgName: { fontFamily: fonts.semibold, fontSize: 15 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    paddingTop: 10,
  }
});

