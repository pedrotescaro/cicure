import type { Organization, OrganizationMember, OrganizationRole } from './types';
import { uid } from '../../../data/store';

export const INDIVIDUAL_ORG: Organization = {
  id: 'org-individual',
  name: 'Consultório Individual (Autônomo)',
  phone: '(11) 98765-4321',
  email: 'contato@carolineferreira.com.br',
  settings: { autoLockMinutes: 15, requireMfa: false },
  membersCount: 1,
  patientsCount: 6,
  isCurrent: true,
  isIndividual: true,
};

export const DEFAULT_ORGS: Organization[] = [
  INDIVIDUAL_ORG,
  {
    id: 'org-clinica-cicatrizar',
    name: 'Clínica Cicatrizar & Saúde Vascular',
    cnpj: '12.345.678/0001-90',
    phone: '(11) 3456-7890',
    email: 'atendimento@cicatrizar.com.br',
    inviteCode: 'CIC-8241',
    address: {
      street: 'Av. Paulista',
      number: '1000, Conj 42',
      city: 'São Paulo',
      state: 'SP'
    },
    settings: { autoLockMinutes: 10, requireMfa: true },
    membersCount: 4,
    patientsCount: 28,
    isCurrent: false,
    isIndividual: false,
  }
];

export function generateInviteCode(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `CIC-${digits}`;
}

export function createNewOrganization(name: string, cnpj?: string, phone?: string): Organization {
  return {
    id: uid(),
    name: name.trim(),
    cnpj: cnpj?.trim() || undefined,
    phone: phone?.trim() || undefined,
    inviteCode: generateInviteCode(),
    isIndividual: false,
    settings: { autoLockMinutes: 15, requireMfa: false },
    membersCount: 1,
    patientsCount: 0,
    isCurrent: true,
  };
}

export function joinOrganizationByCode(
  code: string, 
  existingOrgs: Organization[]
): { org?: Organization; error?: string } {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) {
    return { error: 'Por favor, digite o código de convite da clínica.' };
  }

  // Verifica se já participa
  const alreadyJoined = existingOrgs.find(o => o.inviteCode?.toUpperCase() === cleanCode);
  if (alreadyJoined) {
    return { error: `Você já faz parte da clínica "${alreadyJoined.name}".` };
  }

  // Se for o código demo padrão ou qualquer código CIC-XXXX válido
  if (cleanCode === 'CIC-8241' || cleanCode.startsWith('CIC-')) {
    const newJoinedOrg: Organization = {
      id: uid(),
      name: cleanCode === 'CIC-8241' ? 'Clínica Cicatrizar & Saúde Vascular' : `Clínica Parceira (${cleanCode})`,
      inviteCode: cleanCode,
      isIndividual: false,
      settings: { autoLockMinutes: 15, requireMfa: false },
      membersCount: 5,
      patientsCount: 12,
      isCurrent: true,
    };
    return { org: newJoinedOrg };
  }

  return { error: 'Código de convite inválido ou expirado. Verifique com o administrador da clínica.' };
}

export const DEFAULT_MEMBERS: OrganizationMember[] = [
  {
    id: 'mem-1',
    organizationId: 'org-clinica-cicatrizar',
    userId: 'user-1',
    name: 'Caroline Ferreira',
    email: 'caroline@cicatrizar.com.br',
    role: 'Administrador',
    status: 'active',
    invitedAt: '2026-01-10'
  },
  {
    id: 'mem-2',
    organizationId: 'org-clinica-cicatrizar',
    userId: 'user-2',
    name: 'Dr. Lucas Silveira (Angiologista)',
    email: 'lucas@cicatrizar.com.br',
    role: 'Profissional',
    status: 'active',
    invitedAt: '2026-02-15'
  },
  {
    id: 'mem-3',
    organizationId: 'org-clinica-cicatrizar',
    userId: 'user-3',
    name: 'Beatriz Lima (Técnica / Curativos)',
    email: 'beatriz@cicatrizar.com.br',
    role: 'Assistente',
    status: 'active',
    invitedAt: '2026-03-01'
  },
  {
    id: 'mem-4',
    organizationId: 'org-clinica-cicatrizar',
    userId: 'user-4',
    name: 'Secretaria Clínica',
    email: 'recepcao@cicatrizar.com.br',
    role: 'Somente leitura',
    status: 'invited',
    invitedAt: '2026-04-12'
  }
];

export function inviteMember(orgId: string, name: string, email: string, role: OrganizationRole): OrganizationMember {
  return {
    id: uid(),
    organizationId: orgId,
    userId: uid(),
    name,
    email,
    role,
    status: 'invited',
    invitedAt: new Date().toISOString().slice(0, 10)
  };
}
