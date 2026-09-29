import type { Organization, OrganizationMember, OrganizationRole } from './types';

export const INDIVIDUAL_ORG: Organization = {
  id: 'org-individual',
  name: 'Consultório Individual (Autônomo)',
  settings: { autoLockMinutes: 15, requireMfa: false },
  membersCount: 0,
  patientsCount: 0,
  isCurrent: true,
  isIndividual: true,
};

export const DEFAULT_ORGS: Organization[] = [INDIVIDUAL_ORG];

export function joinOrganizationByCode(
  code: string, 
  existingOrgs: Organization[]
): { org?: Organization; error?: string } {
  void code;
  void existingOrgs;
  return { error: 'Convites de clínica ainda não estão disponíveis nesta versão.' };
}

export const DEFAULT_MEMBERS: OrganizationMember[] = [];

export function inviteMember(orgId: string, name: string, email: string, role: OrganizationRole): OrganizationMember {
  void orgId;
  void name;
  void email;
  void role;
  throw new Error('Convites de equipe ainda não estão disponíveis nesta versão.');
}
