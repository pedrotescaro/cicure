import type { Patient, Wound, Visit, Report } from '../../../domain/types';
import { logAuditEvent } from '../../security/domain/security.service';

export type PatientExportPacket = {
  version: string;
  exportedAt: string;
  exportedBy: string;
  patient: Patient;
  wounds: Wound[];
  visits: Visit[];
  reports: Report[];
  interoperability: {
    fhirResource: 'Bundle';
    type: 'collection';
    totalEntries: number;
  };
};

/**
 * Monta o pacote completo estruturado para exportação clínica
 * e registra obrigatoriamente o evento na trilha de auditoria (LGPD).
 */
export function buildPatientExportPacket(
  patient: Patient,
  wounds: Wound[],
  visits: Visit[],
  reports: Report[]
): PatientExportPacket {
  const packet: PatientExportPacket = {
    version: 'Cicure-v2.0-FHIR-Compatible',
    exportedAt: new Date().toISOString(),
    exportedBy: 'Caroline Ferreira (Profissional Autenticado)',
    patient,
    wounds,
    visits,
    reports,
    interoperability: {
      fhirResource: 'Bundle',
      type: 'collection',
      totalEntries: 1 + wounds.length + visits.length + reports.length
    }
  };

  // Registro obrigatório de auditoria
  logAuditEvent({
    action: 'doc_export',
    actionLabel: 'Exportação do pacote clínico completo do paciente',
    patientName: patient.name,
    entityKind: 'patients',
    entityId: patient.id,
    metadata: {
      woundsCount: wounds.length,
      visitsCount: visits.length,
      format: 'JSON / PDF Bundle'
    }
  });

  return packet;
}
