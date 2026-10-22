import { useState } from 'react';
import { View } from 'react-native';
import { uid, useStore } from '../../../data/store';
import { Badge, Button, Card, Choices, Empty, Field, Txt } from '../../../ui/components';
import { SupportMessage, SupportPage, supportStyles as s } from '../../support/ui/SupportPage';
import { REFERRAL_SPECIALTIES, type ReferralPriority, type ReferralStatus } from '../domain/types';

const labels: Record<ReferralStatus, string> = { solicitado: 'Solicitado', agendado: 'Agendado', realizado: 'Realizado', cancelado: 'Cancelado' };
export default function ReferralsScreen({ patientId }: { patientId: string }) {
  const store = useStore();
  const patient = store.data.patients.find(p => p.id === patientId && !p.deletedAt);
  const wounds = store.data.wounds.filter(w => w.patientId === patientId && !w.deletedAt);
  const referrals = store.data.referrals.filter(r => r.patientId === patientId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [open, setOpen] = useState(false);
  const [specialty, setSpecialty] = useState('');
  const [woundId, setWoundId] = useState('');
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [observations, setObservations] = useState('');
  const [priority, setPriority] = useState<ReferralPriority | ''>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const save = async () => {
    setError(''); setNotice('');
    if (!destination.trim() || !reason.trim() || !specialty || !priority) { setError('Informe especialidade, destino, motivo e prioridade definidos por você.'); return; }
    setBusy(true);
    try { await store.save('referrals', { id: uid(), patientId, woundId: woundId || undefined, specialty, destinationService: destination.trim(), reason: reason.trim(), observations: observations.trim(), priority, status: 'solicitado', date: new Date().toISOString().slice(0, 10), createdAt: new Date().toISOString(), createdBy: store.authUserId || '' });
      setOpen(false); setDestination(''); setReason(''); setObservations(''); setSpecialty(''); setPriority(''); setNotice('Encaminhamento registrado no prontuário. Combine o agendamento com o serviço de destino.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Encaminhamento não salvo. Tente novamente.'); }
    finally { setBusy(false); }
  };
  const updateStatus = async (id: string, status: ReferralStatus) => {
    const referral = referrals.find(r => r.id === id); if (!referral || referral.status === status) return;
    try { await store.save('referrals', { ...referral, status }); setNotice(`Situação atualizada para ${labels[status].toLowerCase()}.`); }
    catch { setError('Não foi possível atualizar a situação. Tente novamente.'); }
  };
  return <SupportPage title="Encaminhamentos" subtitle={patient?.name} backTo={`/patient/${patientId}`}>
    {!patient ? <Empty title="Paciente não encontrado" description="Volte ao prontuário para escolher um paciente." /> : <>
      <Txt style={s.body}>Registre a avaliação de outro serviço ou profissional que você solicitou. Acompanhe aqui se o atendimento foi agendado ou realizado.</Txt>
      <Button title={open ? 'Fechar novo encaminhamento' : 'Registrar encaminhamento'} variant="outline" onPress={() => setOpen(!open)} /><SupportMessage error>{error}</SupportMessage><SupportMessage>{notice}</SupportMessage>
      {open && <View style={s.section}>
        <Txt style={s.heading}>Novo encaminhamento</Txt><Txt>Especialidade de destino *</Txt><Choices options={[...REFERRAL_SPECIALTIES]} value={specialty} onChange={setSpecialty} />
        <Field label="Serviço, profissional ou hospital *" value={destination} onChangeText={setDestination} />
        <Field label="Motivo do encaminhamento *" value={reason} onChangeText={setReason} multiline />
        <Field label="Observações adicionais" value={observations} onChangeText={setObservations} multiline />
        <Txt>Prioridade definida pelo profissional *</Txt><Choices options={['Rotina', 'Prioritário', 'Urgente']} value={priority} onChange={setPriority} />
        {!!wounds.length && <><Txt>Relacionar a uma ferida (opcional)</Txt><Button title="Sem ferida específica" variant={!woundId ? 'dark' : 'outline'} onPress={() => setWoundId('')} />{wounds.map(wound => <Button key={wound.id} title={wound.location} variant={woundId === wound.id ? 'dark' : 'outline'} onPress={() => setWoundId(wound.id)} />)}</>}
        <Button title="Salvar encaminhamento" loading={busy} onPress={() => void save()} />
      </View>}
      {!referrals.length && !open && <Empty title="Nenhum encaminhamento salvo" description="Quando você solicitar avaliação por outro serviço, registre os detalhes e acompanhe a situação por aqui." />}
      {referrals.map(referral => <Card key={referral.id} style={{ borderRadius: 16 }}><Badge tone={referral.status === 'realizado' ? 'green' : referral.status === 'cancelado' ? 'red' : 'neutral'}>{labels[referral.status]} · {referral.priority}</Badge><Txt style={s.heading}>{referral.specialty}</Txt><Txt>Destino: {referral.destinationService}</Txt><Txt style={s.body}>{referral.reason}</Txt>{!!referral.observations && <Txt muted>{referral.observations}</Txt>}<Txt muted>Registrado em {new Date(referral.createdAt).toLocaleDateString('pt-BR')}</Txt><Txt>Atualizar situação</Txt><Choices options={Object.values(labels)} value={labels[referral.status]} onChange={value => { const status = (Object.keys(labels) as ReferralStatus[]).find(key => labels[key] === value)!; void updateStatus(referral.id, status); }} /></Card>)}
    </>}
  </SupportPage>;
}
