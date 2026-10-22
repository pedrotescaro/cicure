import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FileText, Plus } from 'lucide-react-native';
import { uid, useStore } from '../../src/data/store';
import type { Report } from '../../src/domain/types';
import { Button, Card, Empty, Field, Pills, Txt, s } from '../../src/ui/components';
import { fonts, useTheme } from '../../src/ui/theme';
import { useTabContentInset } from '../../src/ui/navigation/useTabContentInset';
import { reportDate } from '../../src/features/reports/domain/report';
import { createReportPdf, previewReport, shareReport } from '../../src/features/reports/domain/pdf';

export default function Reports() {
  const router = useRouter();
  const params = useLocalSearchParams<{ visitId?: string }>();
  const store = useStore();
  const { colors: c } = useTheme();
  const bottomInset = useTabContentInset();
  const [creating, setCreating] = useState(Boolean(params.visitId));
  const [search, setSearch] = useState('');
  const [visitId, setVisitId] = useState(params.visitId || '');
  const [type, setType] = useState<Report['type']>('Completo');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Report | null>(null);
  const visits = store.data.visits.filter(visit => visit.state === 'Concluído' && !visit.deletedAt && store.data.patients.some(patient => patient.id === visit.patientId && !patient.deletedAt && patient.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))).sort((a, b) => b.date.localeCompare(a.date));
  const run = async (action: () => Promise<void>) => { setError(''); setBusy(true); try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível concluir. Tente novamente.'); } finally { setBusy(false); } };
  const generate = () => run(async () => {
    if (store.presentation) throw new Error('Saia do modo apresentação para gerar documentos identificados.');
    const visit = store.data.visits.find(row => row.id === visitId && row.state === 'Concluído');
    const patient = store.data.patients.find(row => row.id === visit?.patientId);
    const wound = store.data.wounds.find(row => row.id === visit?.woundId);
    const profile = store.data.profiles.find(row => row.id === store.authUserId);
    if (!visit || !patient || !wound) throw new Error('Escolha um atendimento concluído.');
    if (!profile?.name || !profile.council || !profile.registration) throw new Error('Complete seu perfil profissional no Menu antes de gerar o relatório.');
    let report: Report = JSON.parse(JSON.stringify({ id: uid(), visitId: visit.id, patientId: patient.id, type, createdAt: new Date().toISOString(), snapshot: { patient, wound, visit, profile } }));
    report = { ...report, uri: await createReportPdf(report, store.scope) };
    if (useStore.getState().scope !== store.scope || useStore.getState().presentation) throw new Error('A conta ou clínica mudou. Abra os relatórios novamente.');
    await store.save('reports', report);
    setSelected(report); setCreating(false);
    store.toast('PDF gerado e salvo neste aparelho.');
  });
  const regenerate = (report: Report) => run(async () => { const uri = await createReportPdf(report, store.scope); if (useStore.getState().scope !== store.scope || useStore.getState().presentation) throw new Error('A conta ou clínica mudou. Abra os relatórios novamente.'); const next = { ...report, uri }; await store.save('reports', next); setSelected(next); });
  return <View style={{ flex: 1, backgroundColor: c.bg }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: bottomInset, gap: 20 }}>
    <View style={{ gap: 10 }}><Txt style={{ fontFamily: fonts.brand, color: c.red, fontSize: 26 }}>cicure</Txt><Txt style={s.h1} accessibilityRole="header">Relatórios</Txt><Txt muted>Gere um PDF a partir de um atendimento concluído e confira antes de compartilhar.</Txt></View>
    <Button title="Novo relatório" icon={Plus} onPress={() => { setCreating(value => !value); setSelected(null); }} disabled={store.presentation} />
    {!!error && <Txt accessibilityRole="alert" style={{ color: c.red }}>{error}</Txt>}
    {store.presentation ? <Txt>Saia do modo apresentação para consultar documentos identificados.</Txt> : <>
    {creating && <View style={{ gap: 16 }}><Field label="Pesquisar paciente" value={search} onChangeText={setSearch} placeholder="Nome do paciente" /><Pills options={['Completo', 'Para o paciente', 'Encaminhamento']} value={type} onChange={value => setType(value as Report['type'])} />
      <Txt accessibilityRole="header" style={s.h2}>Escolha o atendimento</Txt>
      {!visits.length && <Empty title="Nenhum atendimento concluído" description="Conclua um atendimento para gerar seu relatório." action="Ver agenda" onPress={() => router.push('/care')} />}
      {visits.map(visit => <Button key={visit.id} variant={visitId === visit.id ? 'dark' : 'outline'} title={`${store.data.patients.find(row => row.id === visit.patientId)?.name} · ${reportDate(visit.date)} · ${store.data.wounds.find(row => row.id === visit.woundId)?.location}`} onPress={() => setVisitId(visit.id)} />)}
      <Button title="Gerar e salvar PDF" icon={FileText} onPress={generate} disabled={!visitId} loading={busy} />
    </View>}
    {selected && <Card style={{ gap: 14 }}><Txt style={s.h2}>Prévia do conteúdo</Txt><Txt>{selected.snapshot.patient.name} · {selected.type}</Txt><Txt>Ferida: {selected.snapshot.wound.location}</Txt><Txt>Atendimento: {reportDate(selected.snapshot.visit.date)}</Txt><Txt>{selected.snapshot.visit.soap?.assessment || selected.snapshot.visit.plan || 'Sem avaliação textual informada.'}</Txt><Txt muted>O documento usa uma cópia dos dados no momento da geração.</Txt><Button title="Abrir prévia para impressão" variant="outline" onPress={() => run(() => previewReport(selected))} loading={busy} /><Button title="Compartilhar PDF" onPress={() => Alert.alert('Compartilhar documento confidencial', 'Confira o destinatário no próximo passo. O PDF contém a identificação e os registros deste paciente.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Escolher destinatário', onPress: () => run(() => shareReport(selected)) }])} loading={busy} /></Card>}
    <Txt style={s.h2} accessibilityRole="header">Histórico de relatórios</Txt>
    {!store.data.reports.length && !creating && <Empty icon={FileText} title="Ainda não há relatórios" description="Use Novo relatório para escolher um atendimento e gerar seu primeiro PDF." />}
    {[...store.data.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(report => <Card key={report.id} style={{ gap: 12 }}><Txt style={{ fontFamily: fonts.semibold }}>{report.snapshot.patient.name}</Txt><Txt muted>{report.type} · {reportDate(report.createdAt)} · {report.snapshot.wound.location}</Txt><Button title="Consultar relatório" variant="outline" onPress={() => setSelected(report)} /><Button title="Gerar PDF neste aparelho" variant="ghost" loading={busy} onPress={() => regenerate(report)} /></Card>)}
    </>}
  </ScrollView></View>;
}
