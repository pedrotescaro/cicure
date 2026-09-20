import type { EntityKind } from '../domain/types';

const patientId = (value: unknown) => typeof value === 'string' && /^demo-p-[0-5]$/.test(value);
const woundId = (value: unknown) => typeof value === 'string' && /^demo-w-[0-5]$/.test(value);
const visitId = (value: unknown) => typeof value === 'string' && /^demo-(?:v-[0-5]-[0-3]|s-[0-5])$/.test(value);

// Match only the shipped fixtures and their dependent clinical records.
// Never identify demonstration patients by their names.
export function isDemoRecord(kind: EntityKind, id: string, payload: any): boolean {
  if (kind === 'patients') return patientId(id);
  if (kind === 'profiles') return id === 'demo';
  if (kind === 'wounds') return woundId(id) || patientId(payload?.patientId);
  if (kind === 'visits') return visitId(id) || patientId(payload?.patientId) || woundId(payload?.woundId);
  if (kind === 'reports') return patientId(payload?.patientId) || visitId(payload?.visitId) || patientId(payload?.snapshot?.patient?.id);
  return false;
}
