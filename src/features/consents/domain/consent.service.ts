import type { PatientConsent, ConsentType } from './types';
import { CONSENT_DEFINITIONS } from './types';

export function recordConsent(input: { id: string; patientId: string; type: ConsentType; professionalName: string; createdBy: string; acceptedBy: string; evidence: string; now?: string }): PatientConsent {
  const definition = CONSENT_DEFINITIONS.find(d => d.type === input.type);
  if (!definition || !input.patientId || !input.createdBy || !input.professionalName.trim()) throw new Error('Informe o paciente e complete seu perfil profissional.');
  if (!input.acceptedBy.trim()) throw new Error('Informe quem autorizou: paciente ou representante legal.');
  if (input.evidence.trim().length < 10) throw new Error('Descreva como a autorização foi obtida e onde está o termo formal.');
  return { id: input.id, patientId: input.patientId, ...definition, status: 'ativo', termVersion: 'registro-profissional-1',
    signedAt: input.now || new Date().toISOString(), professionalName: input.professionalName.trim(), createdBy: input.createdBy,
    acceptedBy: input.acceptedBy.trim(), evidence: input.evidence.trim() };
}

export function revokeConsent(consent: PatientConsent, reason: string, revokedBy: string, now = new Date().toISOString()): PatientConsent {
  if (consent.status !== 'ativo') throw new Error('Esta autorização já foi revogada.');
  if (!revokedBy || !reason.trim()) throw new Error('Informe o motivo da revogação.');
  return { ...consent, status: 'revogado', revokedAt: now, revokedBy, revocationReason: reason.trim() };
}

export function activeConsent(consents: PatientConsent[], type: ConsentType): PatientConsent | undefined {
  return consents.filter(c => c.type === type && c.status === 'ativo').sort((a, b) => b.signedAt.localeCompare(a.signedAt))[0];
}
