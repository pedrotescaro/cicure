import type { Patient, Wound, Visit, Report } from '../../../domain/types';

export type PatientExportPacket = {
  version: string;
  format: 'cicure-json';
  exportedAt: string;
  exportedBy: string;
  patient: Patient;
  wounds: Wound[];
  visits: Visit[];
  reports: Report[];
};

/**
 * Monta JSON próprio do Cicure. O chamador deve verificar autorização,
 * consentimento e auditoria persistente antes de distribuir o pacote.
 */
export function buildPatientExportPacket(
  patient: Patient,
  wounds: Wound[],
  visits: Visit[],
  reports: Report[],
  exportedBy: string
): PatientExportPacket {
  if (!exportedBy.trim()) throw new Error('Identificação do exportador obrigatória.');
  const packet: PatientExportPacket = {
    version: 'Cicure-JSON-1',
    format: 'cicure-json',
    exportedAt: new Date().toISOString(),
    exportedBy: exportedBy.trim(),
    patient,
    wounds,
    visits,
    reports,
  };

  return packet;
}
