import React, { useCallback, useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Badge, Button, Card, Choices, Field, IconButton, Txt, safeBack, s } from '../../../ui/components';
import { useTheme } from '../../../ui/theme';
import { useStore } from '../../../data/store';
import { dateLabel } from '../../../domain/clinical';
import { createOrganizationInvitation, listOrganizationMembers, revokeOrganizationInvitation, setOrganizationMember, type OrganizationInvitation } from '../domain/organization.service';
import type { OrganizationMember, OrganizationRole } from '../domain/types';

const roles: OrganizationRole[] = ['Administrador', 'Profissional', 'Assistente', 'Somente leitura'];
export default function MembersScreen() {
  const router = useRouter(); const { colors } = useTheme(); const store = useStore();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [role, setRole] = useState<OrganizationRole>('Profissional');
  const [invitation, setInvitation] = useState<OrganizationInvitation>(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const orgId = store.activeOrg.id; const admin = store.activeOrg.role === 'Administrador';
  const refresh = useCallback(async () => {
    if (orgId === 'org-individual') return;
    setBusy(true); setMessage('');
    try { setMembers(await listOrganizationMembers(orgId)); } catch (e) { setMessage(e instanceof Error ? e.message : 'Não foi possível carregar a equipe.'); }
    finally { setBusy(false); }
  }, [orgId]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  const run = async (operation: () => Promise<void>) => {
    setBusy(true); setMessage('');
    try { await operation(); await refresh(); setMessage('Alteração confirmada pelo servidor.'); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Não foi possível salvar a alteração.'); }
    finally { setBusy(false); }
  };
  return <View style={{ flex: 1, backgroundColor: colors.bg }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 18, maxWidth: 840, width: '100%', alignSelf: 'center' }}>
    <View style={s.row}><IconButton icon={ChevronLeft} label="Voltar" onPress={() => safeBack(router, '/organization')} /><Txt style={s.h1}>Equipe e permissões</Txt></View>
    {store.workMode !== 'group' ? <><Txt>Abra uma clínica para ver seus integrantes.</Txt><Button title="Escolher clínica" onPress={() => router.push('/organization')} /></> : <>
      <Txt style={s.h2}>{store.activeOrg.name}</Txt>
      <Txt muted style={{ lineHeight: 23 }}>Administradores gerenciam a equipe e registros. Profissionais registram e concluem o cuidado. Assistentes cadastram pacientes, feridas, agendamentos e materiais. Somente leitura consulta os registros.</Txt>
      {members.map(member => <MemberRow key={member.id} member={member} canManage={admin && member.userId !== store.authUserId} busy={busy}
        onChange={(newRole, status) => void run(() => setOrganizationMember(orgId, member.userId, newRole, status))}
        onRevoke={() => void run(() => revokeOrganizationInvitation(member.invitationId ?? member.id))} />)}
      {!busy && !members.length && <Txt>Nenhum integrante disponível. Atualize a lista para confirmar seu acesso.</Txt>}
      {admin && <View style={{ gap: 14, paddingTop: 12 }}>
        <Txt style={s.h2}>Convidar integrante</Txt>
        <Field label="Nome do integrante" value={name} onChangeText={setName} />
        <Field label="E-mail da conta que receberá acesso" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={setEmail} />
        <Choices options={roles} value={role} onChange={value => setRole(value as OrganizationRole)} />
        <Button title="Criar convite de acesso" loading={busy} onPress={() => void run(async () => { const created = await createOrganizationInvitation(orgId, name, email, role); setInvitation(created); setName(''); setEmail(''); })} />
        {invitation && <Card style={{ gap: 12 }}>
          <Txt>Convite criado para {invitation.email}, com permissão de {invitation.role}.</Txt>
          <Txt muted>Válido até {dateLabel(invitation.expiresAt, 'dd/MM/yyyy HH:mm')}. Compartilhe o código com a pessoa convidada; o Cicure não enviou um e-mail automaticamente.</Txt>
          <Txt selectable>{invitation.token}</Txt>
          <Button title="Compartilhar convite" variant="outline" onPress={() => void Share.share({ message: 'Você recebeu um convite para ' + store.activeOrg.name + ' no Cicure. Entre com a conta ' + invitation.email + ', abra Menu → Clínicas e equipes → Aceitar convite e cole: ' + invitation.token }).catch(() => setMessage('Não foi possível abrir o compartilhamento. Copie o código selecionando o texto acima.'))} />
        </Card>}
      </View>}
      <Button title="Atualizar integrantes" variant="outline" loading={busy} onPress={() => void refresh()} />
      {Boolean(message) && <Txt accessibilityLiveRegion="polite">{message}</Txt>}
    </>}
  </ScrollView></View>;
}
function MemberRow({ member, canManage, busy, onChange, onRevoke }: { member: OrganizationMember; canManage: boolean; busy: boolean; onChange: (role: OrganizationRole, status: 'active' | 'suspended') => void; onRevoke: () => void }) {
  const [role, setRole] = useState(member.role);
  return <Card style={{ gap: 12 }}>
    <Txt style={{ fontSize: 18 }}>{member.name}</Txt><Txt>{member.email}</Txt><Badge tone={member.status === 'active' ? 'green' : 'amber'}>{member.status === 'active' ? member.role : member.status === 'invited' ? 'Convite aguardando aceitação' : 'Acesso suspenso'}</Badge>
    {member.status === 'invited' && member.expiresAt && <Txt muted>Convite válido até {dateLabel(member.expiresAt, 'dd/MM/yyyy HH:mm')}.</Txt>}
    {canManage && (member.status === 'invited' ? <Button title="Cancelar convite" variant="outline" loading={busy} onPress={onRevoke} /> : <><Choices options={roles} value={role} onChange={value => setRole(value as OrganizationRole)} /><Button title="Salvar permissão deste integrante" variant="outline" loading={busy} onPress={() => onChange(role, member.status === 'suspended' ? 'suspended' : 'active')} /><Button title={member.status === 'active' ? 'Suspender acesso deste integrante' : 'Reativar acesso deste integrante'} variant="outline" loading={busy} onPress={() => onChange(role, member.status === 'active' ? 'suspended' : 'active')} /></>)}
  </Card>;
}
