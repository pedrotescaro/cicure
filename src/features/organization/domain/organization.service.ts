
import { createAccountClient } from '../../../data/supabase';
import type { Organization, OrganizationMember, OrganizationRole } from './types';
export { permissionsForRole, canWriteOrganizationRecord } from './permissions';

export const INDIVIDUAL_ORG: Organization = { id: 'org-individual', name: 'Meu atendimento individual', settings: { autoLockMinutes: 15, requireMfa: false }, membersCount: 0, patientsCount: 0, isCurrent: true, isIndividual: true };
export const DEFAULT_ORGS: Organization[] = [INDIVIDUAL_ORG];
export const DEFAULT_MEMBERS: OrganizationMember[] = [];

// Legacy synchronous prototype entry points deliberately cannot fabricate membership.
export function joinOrganizationByCode(code: string, existingOrgs: Organization[]): { org?: Organization; error?: string } {
  void code; void existingOrgs;
  return { error: 'Convites locais não estão disponíveis. Valide o convite pela sua conta com internet.' };
}
export function inviteMember(orgId: string, name: string, email: string, role: OrganizationRole): OrganizationMember {
  void orgId; void name; void email; void role;
  throw new Error('Convites locais não estão disponíveis. Use Criar convite na equipe.');
}
async function request<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { useStore } = await import('../../../data/store');
  const userId = useStore.getState().authUserId;
  if (!userId) throw new Error('Entre na sua conta para acessar clínicas e equipes.');
  const client = await createAccountClient('user:' + userId);
  const { data, error } = await client.rpc(name, args);
  if (useStore.getState().authUserId !== userId) throw new Error('A conta mudou. Abra a clínica novamente pela conta atual.');
  if (error) {
    if (error.code === '42501' || error.code === '28000') throw new Error('Seu acesso à clínica não foi confirmado. Entre novamente ou procure um administrador.');
    if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) throw new Error('Conecte-se à internet para confirmar sua permissão na clínica.');
    if (/invitation|invite|token|email/i.test(error.message || '')) throw new Error('O convite não é válido para esta conta, expirou ou já foi usado. Confira o e-mail da conta e peça um novo convite ao administrador.');
    if (/last.*admin|administrator|último/i.test(error.message || '')) throw new Error('A clínica precisa manter pelo menos um administrador ativo. Defina outro administrador antes de alterar este acesso.');
    throw new Error('Não foi possível concluir a operação na clínica. Confira os dados, atualize a lista e tente novamente.');
  }
  return data as T;
}
export function listOrganizations(): Promise<Organization[]> { return request('list_organizations'); }
export function verifyOrganizationAccess(organizationId: string): Promise<{ organization: Organization; role: OrganizationRole; status: 'active' }> {
  return request('get_organization_access', { p_organization_id: organizationId });
}
export function createOrganization(name: string, cnpj?: string, phone?: string): Promise<Organization> {
  if (name.trim().length < 2) throw new Error('Informe um nome de clínica com pelo menos duas letras.');
  const digits = cnpj?.replace(/\D/g, '') || '';
  if (digits && digits.length !== 14) throw new Error('Informe um CNPJ com 14 números ou deixe em branco.');
  return request('create_organization', { p_name: name.trim(), p_cnpj: digits || null, p_phone: phone?.trim() || null });
}
export function acceptOrganizationInvitation(token: string): Promise<Organization> {
  if (!/^[0-9a-f]{64}$/i.test(token.trim())) throw new Error('Cole o convite completo fornecido pelo administrador.');
  return request('accept_organization_invitation', { p_token: token.trim().toLowerCase() });
}
export type OrganizationInvitation = { id: string; token: string; expiresAt: string; email: string; role: OrganizationRole };
export function createOrganizationInvitation(organizationId: string, name: string, email: string, role: OrganizationRole): Promise<OrganizationInvitation> {
  if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Informe o nome e um e-mail válido para o convite.');
  return request('create_organization_invitation', { p_organization_id: organizationId, p_name: name.trim(), p_email: email.trim().toLowerCase(), p_role: role });
}
export function listOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> { return request('list_organization_members', { p_organization_id: organizationId }); }
export function setOrganizationMember(organizationId: string, userId: string, role: OrganizationRole, status: 'active' | 'suspended'): Promise<void> {
  return request('set_organization_member', { p_organization_id: organizationId, p_user_id: userId, p_role: role, p_status: status });
}
export function revokeOrganizationInvitation(invitationId: string): Promise<void> { return request('revoke_organization_invitation', { p_invitation_id: invitationId }); }
