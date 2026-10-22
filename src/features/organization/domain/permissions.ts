import type { OrganizationPermissions, OrganizationRole } from './types';

export function permissionsForRole(role: OrganizationRole): OrganizationPermissions {
  const clinician = role === 'Administrador' || role === 'Profissional';
  return { canViewAllPatients: true, canEditPatients: role !== 'Somente leitura', canSignVisits: clinician, canManageMembers: role === 'Administrador', canViewAudit: role === 'Administrador', canManageInventory: role !== 'Somente leitura', canExport: clinician };
}

export function canWriteOrganizationRecord(role: OrganizationRole, kind: string, payload: Record<string, unknown>): boolean {
  if (role === 'Somente leitura') return false;
  if (role === 'Administrador' || role === 'Profissional') return kind !== 'profiles';
  return ['patients', 'wounds', 'products', 'inventory_items', 'inventory_movements'].includes(kind) || (kind === 'visits' && payload.state === 'Agendado');
}
