import { useState } from 'react';
import { View } from 'react-native';
import { uid, useStore } from '../../../data/store';
import { Accordion, Badge, Button, Card, Empty, Field, Txt } from '../../../ui/components';
import { SupportMessage, SupportPage, supportStyles as s } from '../../support/ui/SupportPage';
import { activeConsent, recordConsent, revokeConsent } from '../domain/consent.service';
import { CONSENT_DEFINITIONS, type ConsentType, type PatientConsent } from '../domain/types';

export default function ConsentCenterScreen({ patientId }: { patientId: string }) {
  const store = useStore();
  const patient = store.data.patients.find(p => p.id === patientId && !p.deletedAt);
  const profile = store.data.profiles[0];
  const consents = store.data.consents.filter(c => c.patientId === patientId).sort((a, b) => b.signedAt.localeCompare(a.signedAt));
  const [collecting, setCollecting] = useState<ConsentType | null>(null);
  const [revoking, setRevoking] = useState<PatientConsent | null>(null);
  const [acceptedBy, setAcceptedBy] = useState('');
  const [evidence, setEvidence] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const collect = async () => {
    if (!collecting) return;
    setError(''); setNotice(''); setBusy(true);
    try {
      if (activeConsent(consents, collecting)) throw new Error('Já existe autorização ativa para esta finalidade.');
      await store.save('consents', recordConsent({ id: uid(), patientId, type: collecting, professionalName: profile?.name || '', createdBy: store.authUserId || '', acceptedBy, evidence }));
      setCollecting(null); setAcceptedBy(''); setEvidence(''); setNotice('Autorização registrada no prontuário, com a identificação do profissional.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Autorização não salva. Tente novamente.'); }
    finally { setBusy(false); }
  };
  const revoke = async () => {
    if (!revoking) return;
    setError(''); setNotice(''); setBusy(true);
    try { await store.save('consents', revokeConsent(revoking, reason, store.authUserId || '')); setRevoking(null); setReason(''); setNotice('Revogação salva. O registro da autorização anterior permanece no histórico.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Revogação não salva. Tente novamente.'); }
    finally { setBusy(false); }
  };
  return <SupportPage title="Autorizações do paciente" subtitle={patient ? `${patient.name} · cada finalidade tem uma autorização própria.` : undefined} backTo={`/patient/${patientId}`}>
    {!patient ? <Empty title="Paciente não encontrado" description="Volte ao prontuário para escolher um paciente." /> : <>
      <Txt style={s.body}>Registre aqui uma autorização formal que você já obteve, explicando a finalidade ao paciente. O aplicativo guarda o registro e a revogação; a assinatura digital certificada não está disponível.</Txt>
      <SupportMessage error>{error}</SupportMessage><SupportMessage>{notice}</SupportMessage>
      {CONSENT_DEFINITIONS.map(definition => {
        const active = activeConsent(consents, definition.type);
        return <Card key={definition.type} style={{ borderRadius: 16 }}><Txt style={s.heading}>{definition.title}</Txt><Txt muted style={s.body}>{definition.description}</Txt><Badge tone={active ? 'green' : 'neutral'}>{active ? 'Autorização registrada' : 'Sem autorização ativa'}</Badge>
          {active && <Txt muted>Registrada em {new Date(active.signedAt).toLocaleDateString('pt-BR')} por {active.professionalName}. Autorizou: {active.acceptedBy || 'Não informado no registro anterior'}.</Txt>}
          {collecting === definition.type ? <View style={s.section}>
            <Field label="Nome de quem autorizou *" value={acceptedBy} onChangeText={setAcceptedBy} placeholder="Paciente ou representante legal" />
            <Field label="Como foi obtida a autorização? *" value={evidence} onChangeText={setEvidence} multiline placeholder="Descreva a manifestação e a referência do termo formal arquivado." />
            <Button title="Confirmar autorização obtida" loading={busy} onPress={() => void collect()} /><Button title="Cancelar registro" variant="ghost" onPress={() => setCollecting(null)} />
          </View> : revoking?.id === active?.id && revoking ? <View style={s.section}>
            <Field label="Motivo da revogação *" value={reason} onChangeText={setReason} multiline placeholder="Registre a solicitação do paciente ou representante." />
            <Button title="Confirmar revogação" loading={busy} onPress={() => void revoke()} /><Button title="Cancelar revogação" variant="ghost" onPress={() => setRevoking(null)} />
          </View> : <Button title={active ? 'Revogar autorização' : 'Registrar autorização obtida'} variant="outline" onPress={() => { setError(''); setNotice(''); if (active) { setRevoking(active); setCollecting(null); } else { setCollecting(definition.type); setRevoking(null); setAcceptedBy(''); setEvidence(''); } }} />}
        </Card>;
      })}
      <Accordion title={`Histórico de autorizações (${consents.length})`}>
        {!consents.length && <Txt muted>Nenhuma autorização registrada para este paciente.</Txt>}
        {consents.map(consent => <View key={consent.id} style={s.section}><Txt style={s.heading}>{consent.title}</Txt><Txt>{consent.status === 'ativo' ? 'Ativa' : 'Revogada'} · {new Date(consent.signedAt).toLocaleString('pt-BR')}</Txt><Txt muted>Responsável pelo registro: {consent.professionalName}</Txt><Txt muted>Autorizou: {consent.acceptedBy || 'Não informado'} · {consent.evidence || 'Sem referência do termo'}</Txt>{consent.revokedAt && <Txt>Revogada em {new Date(consent.revokedAt).toLocaleString('pt-BR')}. Motivo: {consent.revocationReason}</Txt>}</View>)}
      </Accordion>
    </>}
  </SupportPage>;
}
