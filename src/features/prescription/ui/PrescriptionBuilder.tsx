import { useState } from 'react';
import { Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useStore } from '../../../data/store';
import { Badge, Button, Card, Empty, Field, Txt } from '../../../ui/components';
import { SupportMessage, SupportPage, supportStyles as s } from '../../support/ui/SupportPage';
import { TemplatePickerModal } from '../../templates/ui/TemplatePickerModal';
import { createTemplate } from '../../templates/domain/template.service';
import { createPrescription, duplicatePrescription, prescriptionToTemplateContent, reviewPrescription } from '../domain/prescription.service';
import type { Prescription } from '../domain/types';
import { generatePrescriptionHTML } from './PrescriptionPDF';

const fields = [
  ['cleaning', 'Técnica de limpeza'], ['solution', 'Solução utilizada'], ['primaryCoverage', 'Cobertura principal *'], ['secondaryCoverage', 'Cobertura secundária'],
  ['fixation', 'Fixação'], ['perilesionalProtection', 'Proteção da pele ao redor da ferida'], ['changeFrequency', 'Frequência de troca *'],
  ['expectedDuration', 'Duração prevista *'], ['observations', 'Orientações e observações'],
] as const;
const statusLabel = (p: Prescription) => p.status === 'reviewed' ? 'Revisado' : p.status === 'archived' ? 'Arquivado' : 'Rascunho';

export default function PrescriptionBuilder({ patientId, woundId, prescriptionId }: { patientId: string; woundId?: string; prescriptionId?: string }) {
  const store = useStore();
  const router = useRouter();
  const patient = store.data.patients.find(p => p.id === patientId && !p.deletedAt);
  const wounds = store.data.wounds.filter(w => w.patientId === patientId && !w.deletedAt);
  const prescriptions = store.data.prescriptions.filter(p => p.patientId === patientId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const existing = prescriptionId ? prescriptions.find(p => p.id === prescriptionId) : undefined;
  const [selectedWoundId, setSelectedWoundId] = useState(woundId || wounds[0]?.id || '');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const activeWound = wounds.find(w => w.id === (existing?.woundId || selectedWoundId));
  const createCopy = async (source: Prescription) => {
    try { const copy = duplicatePrescription(source, store.authUserId || ''); await store.save('prescriptions', copy); router.push(`/patient/${patientId}/prescription/${copy.id}` as never); }
    catch { setError('A cópia não foi salva. Tente novamente.'); }
  };
  return <SupportPage title="Prescrições de curativo" subtitle={patient?.name} backTo={`/patient/${patientId}`}>
    {!patient ? <Empty title="Paciente não encontrado" description="Volte ao prontuário para escolher um paciente." /> : prescriptionId && !existing ? <Empty title="Registro não encontrado" description="Este registro não está disponível na sua conta." /> : !wounds.length ? <Empty title="Cadastre uma ferida primeiro" description="A prescrição deve estar ligada à ferida que está sendo acompanhada." /> : <>
      <Txt style={s.body}>Escreva a conduta definida por você. A revisão fica registrada no prontuário. A assinatura digital certificada depende de integração externa e continua indisponível.</Txt>
      <SupportMessage error>{error}</SupportMessage>
      {!existing && <><Txt style={s.heading}>Para qual ferida?</Txt>{wounds.map(wound => <Button key={wound.id} title={wound.location} variant={selectedWoundId === wound.id ? 'dark' : 'outline'} onPress={() => { setSelectedWoundId(wound.id); setStarting(false); }} />)}<Button title={starting ? 'Fechar novo registro' : 'Criar registro de prescrição'} onPress={() => setStarting(!starting)} /></>}
      {activeWound && (existing || starting) && <PrescriptionEditor key={existing?.id || `new:${activeWound.id}`} patientId={patientId} woundId={activeWound.id} source={existing} onCopy={createCopy} />}
      {!!prescriptions.length && !existing && <View style={s.section}><Txt style={s.heading}>Registros anteriores</Txt>{prescriptions.map(p => <Card key={p.id} style={{ borderRadius: 16 }}><Badge tone={p.status === 'reviewed' ? 'green' : 'neutral'}>{statusLabel(p)}</Badge><Txt>{store.data.wounds.find(w => w.id === p.woundId)?.location || 'Ferida'} · {new Date(p.date).toLocaleDateString('pt-BR')} · versão {p.version}</Txt><Txt muted>{p.primaryCoverage || 'Cobertura ainda não informada'}</Txt><Button title="Abrir registro" variant="outline" onPress={() => router.push(`/patient/${patientId}/prescription/${p.id}` as never)} /></Card>)}</View>}
    </>}
  </SupportPage>;
}

function PrescriptionEditor({ patientId, woundId, source, onCopy }: { patientId: string; woundId: string; source?: Prescription; onCopy: (p: Prescription) => Promise<void> }) {
  const store = useStore();
  const router = useRouter();
  const profile = store.data.profiles[0];
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(([key]) => [key, source?.[key] || ''])) as Record<(typeof fields)[number][0], string>);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showTemplate, setShowTemplate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const locked = source?.status === 'reviewed' || source?.status === 'archived';
  const makeDraft = (): Prescription => {
    const created = createPrescription({ patientId, woundId, ...values, professional: { name: profile?.name || '', council: profile?.council || '', registration: profile?.registration || '' }, createdBy: store.authUserId || '' });
    return source ? { ...source, ...values, professional: created.professional } : created;
  };
  const save = async (review: boolean) => {
    setError(''); setNotice(''); setBusy(true);
    try { let record = makeDraft(); if (!Object.values(values).some(v => v.trim())) throw new Error('Preencha pelo menos um campo antes de salvar o rascunho.'); if (review) record = reviewPrescription(record);
      await store.save('prescriptions', record); setNotice(review ? 'Revisão profissional salva. A assinatura certificada não foi realizada.' : 'Rascunho salvo no prontuário.');
      if (!source || review) router.replace(`/patient/${patientId}/prescription/${record.id}` as never);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Registro não salvo. Tente novamente.'); }
    finally { setBusy(false); }
  };
  const exportPDF = async () => {
    if (!source) return;
    setBusy(true); setError('');
    try {
      if (Platform.OS === 'web') throw new Error('A exportação deste registro está disponível no aplicativo Android.');
      if (!(await Sharing.isAvailableAsync())) throw new Error('O compartilhamento de arquivos não está disponível neste aparelho.');
      const userId = store.authUserId;
      const patient = store.data.patients.find(p => p.id === source.patientId)!;
      const wound = store.data.wounds.find(w => w.id === source.woundId)!;
      const result = await Print.printToFileAsync({ html: generatePrescriptionHTML(source, patient, wound) });
      if (useStore.getState().authUserId !== userId || useStore.getState().presentation) return;
      await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', UTI: '.pdf', dialogTitle: 'Compartilhar registro de prescrição' });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível gerar o PDF. Tente novamente.'); }
    finally { setBusy(false); }
  };
  const saveTemplate = async () => {
    setError(''); setBusy(true);
    try { await store.save('clinical_templates', createTemplate({ name: templateName, type: 'prescricao', content: prescriptionToTemplateContent(makeDraft()), createdBy: store.authUserId || '' })); setShowTemplate(false); setTemplateName(''); setNotice('Modelo salvo na sua biblioteca.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Modelo não salvo. Tente novamente.'); }
    finally { setBusy(false); }
  };
  return <View style={s.section}>
    <Txt style={s.heading}>{source ? `Versão ${source.version} · ${statusLabel(source)}` : 'Novo registro'}</Txt>
    <SupportMessage error>{error}</SupportMessage><SupportMessage>{notice}</SupportMessage>
    {!locked && <Button title="Preencher com um modelo meu" variant="outline" onPress={() => setTemplateOpen(true)} />}
    {fields.map(([key, label]) => locked ? <View key={key} style={{ gap: 4 }}><Txt style={{ fontWeight: '600' }}>{label.replace(' *', '')}</Txt><Txt muted style={s.body}>{values[key] || 'Não informado'}</Txt></View> : <Field key={key} label={label} value={values[key]} onChangeText={value => setValues(previous => ({ ...previous, [key]: value }))} multiline={key === 'observations'} />)}
    <Txt muted style={s.body}>{source?.professional.name || profile?.name || 'Complete seu perfil profissional'} · {source?.professional.council || profile?.council} {source?.professional.registration || profile?.registration}</Txt>
    {!locked ? <><Button title="Salvar rascunho" variant="outline" loading={busy} onPress={() => void save(false)} /><Button title="Confirmar revisão e salvar no prontuário" loading={busy} onPress={() => void save(true)} /></> : <><Txt muted style={s.body}>Este conteúdo foi preservado. Para alterar a conduta, crie uma nova versão e revise novamente.</Txt><Button title="Criar nova versão para revisar" loading={busy} onPress={() => { if (source) void onCopy(source); }} /></>}
    {source && <Button title="Gerar PDF do registro salvo" variant="outline" loading={busy} onPress={() => void exportPDF()} />}
    <Button title={showTemplate ? 'Fechar modelo' : 'Guardar conteúdo como modelo pessoal'} variant="ghost" onPress={() => setShowTemplate(!showTemplate)} />
    {showTemplate && <><Field label="Nome do modelo *" value={templateName} onChangeText={setTemplateName} /><Button title="Salvar modelo pessoal" loading={busy} onPress={() => void saveTemplate()} /></>}
    <TemplatePickerModal visible={templateOpen} type="prescricao" onClose={() => setTemplateOpen(false)} onSelect={template => {
      setValues(previous => Object.fromEntries(fields.map(([key]) => [key, typeof template.content[key] === 'string' ? template.content[key] : previous[key]])) as typeof values);
      setNotice('Modelo aplicado ao rascunho. Revise todos os campos antes de salvar.');
    }} />
  </View>;
}
