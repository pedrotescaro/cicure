import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronLeft, Plus, Users } from 'lucide-react-native';
import { Badge, Button, Card, Empty, IconButton, Txt, safeBack, s } from '../../../ui/components';
import { useTheme } from '../../../ui/theme';
import { useStore } from '../../../data/store';
import { listOrganizations } from '../domain/organization.service';
import { WorkspaceSelectorModal } from './WorkspaceSelectorModal';

export default function OrganizationScreen() {
  const router = useRouter(); const { colors } = useTheme(); const store = useStore();
  const [modal, setModal] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setBusy(true); setError('');
    try { const organizations = await listOrganizations(); useStore.setState(state => ({ organizations: [state.organizations.find(item => item.isIndividual)!, ...organizations].filter(Boolean) })); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível carregar as clínicas.'); }
    finally { setBusy(false); }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  const select = async (organizationId?: string) => {
    setBusy(true); setError('');
    try { await store.setWorkMode(organizationId ? 'group' : 'individual', organizationId); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível abrir este espaço.'); }
    finally { setBusy(false); }
  };
  return <View style={{ flex: 1, backgroundColor: colors.bg }}><ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 18, maxWidth: 840, width: '100%', alignSelf: 'center' }}>
    <View style={s.row}><IconButton icon={ChevronLeft} label="Voltar" onPress={() => safeBack(router, '/more')} /><Txt style={s.h1}>Clínicas e equipes</Txt></View>
    <Txt muted style={{ lineHeight: 24 }}>Seu espaço individual e os dados de cada clínica são separados. Uma clínica nova começa vazia. Para abrir dados da equipe, o Cicure confirma sua permissão com internet.</Txt>
    <Card style={{ gap: 12 }}><Txt style={s.h2}>Meu atendimento individual</Txt><Txt>Registros privados da sua conta, com rascunhos disponíveis sem internet.</Txt><Badge tone={store.workMode === 'individual' ? 'green' : 'neutral'}>{store.workMode === 'individual' ? 'Espaço ativo' : 'Individual'}</Badge><Button title="Abrir meu espaço individual" variant="outline" loading={busy} onPress={() => void select()} /></Card>
    {store.organizations.filter(item => !item.isIndividual).map(organization => <Card key={organization.id} style={{ gap: 12 }}>
      <Txt style={s.h2}>{organization.name}</Txt><Txt>{organization.membersCount} integrante(s) · {organization.patientsCount} paciente(s)</Txt><Badge tone={store.workMode === 'group' && store.activeOrg.id === organization.id ? 'green' : 'neutral'}>{organization.role ?? 'Equipe'}</Badge>
      <Button title={store.workMode === 'group' && store.activeOrg.id === organization.id ? 'Atualizar acesso à clínica' : 'Abrir esta clínica'} loading={busy} onPress={() => void select(organization.id)} />
      {store.workMode === 'group' && store.activeOrg.id === organization.id && <Button title="Ver equipe e permissões" icon={Users} variant="outline" onPress={() => router.push('/organization/members')} />}
    </Card>)}
    {!busy && !store.organizations.some(item => !item.isIndividual) && <Empty title="Você ainda não participa de uma clínica" description="Crie uma equipe ou aceite um convite destinado ao e-mail da sua conta." />}
    {Boolean(error) && <Txt accessibilityRole="alert">{error}</Txt>}
    <Button title="Atualizar lista de clínicas" variant="outline" loading={busy} onPress={() => void refresh()} />
    <Button title="Criar clínica ou aceitar convite" icon={Plus} onPress={() => setModal(true)} />
  </ScrollView><WorkspaceSelectorModal visible={modal} onClose={() => { setModal(false); void refresh(); }} /></View>;
}
