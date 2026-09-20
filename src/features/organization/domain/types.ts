export type OrganizationRole = 'Administrador' | 'Profissional' | 'Assistente' | 'Somente leitura';

export type OrganizationPermissions = {
  canViewAllPatients: boolean;
  canEditPatients: boolean;
  canSignVisits: boolean;
  canManageMembers: boolean;
  canViewAudit: boolean;
  canManageInventory: boolean;
  canExport: boolean;
};

export type OrganizationMember = {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  email: string;
  role: OrganizationRole;
  status: 'invited' | 'active' | 'suspended';
  invitedAt: string;
};

export type WorkMode = 'individual' | 'group';

export type Organization = {
  id: string;
  name: string;
  cnpj?: string;
  inviteCode?: string;
  isIndividual?: boolean;
  logoUrl?: string;
  phone?: string;
  email?: string;
  address?: {
    street: string;
    number: string;
    city: string;
    state: string;
  };
  settings: {
    autoLockMinutes: number;
    requireMfa: boolean;
  };
  membersCount: number;
  patientsCount: number;
  isCurrent: boolean;
};
