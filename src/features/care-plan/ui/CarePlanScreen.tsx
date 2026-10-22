import { useState } from 'react';
import { View } from 'react-native';
import { useStore } from '../../../data/store';
import { Accordion, Badge, Button, Choices, Empty, Field, Txt } from '../../../ui/components';
import { SupportMessage, SupportPage, supportStyles as s } from '../../support/ui/SupportPage';
import { createCarePlan, createGoal, reviseCarePlan, updateGoalStatus } from '../domain/care-plan.service';
import type { CarePlan, CarePlanGoal, GoalStatus } from '../domain/types';
import { validISODate } from '../../inventory/domain/inventory.service';

export default function CarePlanScreen({ patientId }: { patientId: string }) {
  const store = useStore();
  const patient = store.data.patients.find(p => p.id === patientId && !p.deletedAt);
  const wounds = store.data.wounds.filter(w => w.patientId === patientId && !w.deletedAt);
  const [selectedWoundId, setSelectedWoundId] = useState(wounds[0]?.id || '');
  const wound = wounds.find(w => w.id === selectedWoundId);
  const plans = store.data.care_plans.filter(p => p.patientId === patientId && p.woundId === wound?.id).sort((a, b) => b.version - a.version || b.createdAt.localeCompare(a.createdAt));
  const current = plans.find(p => p.status === 'Ativo' && !plans.some(next => next.previousVersionId === p.id)) || plans[0];
  return <SupportPage title="Plano de cuidados" subtitle={patient?.name} backTo={`/patient/${patientId}`}>
    {!patient || !wounds.length ? <Empty title="Cadastre uma ferida primeiro" description="O plano acompanha os objetivos e os cuidados de uma ferida do paciente." /> : <>
      <Txt style={s.body}>Registre os cuidados definidos por você e acompanhe as metas. Cada revisão mantém a versão anterior no histórico.</Txt>
      <Txt style={s.heading}>Escolha a ferida</Txt>{wounds.map(w => <Button key={w.id} title={w.location} variant={selectedWoundId === w.id ? 'dark' : 'outline'} onPress={() => setSelectedWoundId(w.id)} />)}
      {!!wound && <CarePlanEditor key={current?.id || `new:${wound.id}`} patientId={patientId} woundId={wound.id} source={current} plans={plans} />}
    </>}
  </SupportPage>;
}

function CarePlanEditor({ patientId, woundId, source, plans }: { patientId: string; woundId: string; source?: CarePlan; plans: CarePlan[] }) {
  const store = useStore();
  const [draft] = useState(() => source || createCarePlan({ patientId, woundId, createdBy: store.authUserId || '' }));
  const [objectives, setObjectives] = useState(draft.objectives);
  const [clinicalGoal, setClinicalGoal] = useState(draft.clinicalGoal);
  const [dressingFrequency, setDressingFrequency] = useState(draft.dressingFrequency);
  const [products, setProducts] = useState(draft.plannedProducts.join('\n'));
  const [instructions, setInstructions] = useState(draft.instructions);
  const [followUpFrequency, setFollowUpFrequency] = useState(draft.followUpFrequency);
  const [nextReviewDate, setNextReviewDate] = useState(draft.nextReviewDate);
  const [goals, setGoals] = useState<CarePlanGoal[]>(draft.goals);
  const [goalDescription, setGoalDescription] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const addGoal = () => {
    if (!goalDescription.trim()) { setError('Descreva a meta antes de adicionar.'); return; }
    if (goalDate && !validISODate(goalDate)) { setError('Informe uma data válida para a meta no formato AAAA-MM-DD.'); return; }
    setGoals(previous => [...previous, createGoal(draft.id, goalDescription.trim(), goalDate)]); setGoalDescription(''); setGoalDate(''); setError(''); setNotice('Meta adicionada à edição. Salve o plano para registrá-la no prontuário.');
  };
  const save = async () => {
    setError(''); setNotice('');
    if (!objectives.trim() && !clinicalGoal.trim()) { setError('Descreva o objetivo ou a meta geral do plano.'); return; }
    if (nextReviewDate && !validISODate(nextReviewDate)) { setError('A data de revisão deve ser válida e ter o formato AAAA-MM-DD.'); return; }
    setBusy(true);
    const updates = { objectives: objectives.trim(), clinicalGoal: clinicalGoal.trim(), dressingFrequency: dressingFrequency.trim(), plannedProducts: products.split('\n').map(p => p.trim()).filter(Boolean), instructions: instructions.trim(), followUpFrequency: followUpFrequency.trim(), nextReviewDate, goals };
    try {
      if (source) {
        const { updatedPrevious, newVersion } = reviseCarePlan(source, updates, store.authUserId || '');
        // Preserve the previous active record if writing the new version fails.
        await store.save('care_plans', newVersion);
        await store.save('care_plans', updatedPrevious);
        setNotice(`Versão ${newVersion.version} salva. O histórico foi preservado.`);
      } else { await store.save('care_plans', { ...draft, ...updates, updatedAt: new Date().toISOString() }); setNotice('Plano salvo no prontuário.'); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o plano. Tente novamente.'); }
    finally { setBusy(false); }
  };
  return <View style={s.section}>
    <Badge>{source ? `Versão ${source.version}` : 'Novo plano'}</Badge><SupportMessage error>{error}</SupportMessage><SupportMessage>{notice}</SupportMessage>
    <Field label="Objetivo dos cuidados *" value={objectives} onChangeText={setObjectives} multiline />
    <Field label="Meta geral" value={clinicalGoal} onChangeText={setClinicalGoal} />
    <Field label="Frequência dos curativos" value={dressingFrequency} onChangeText={setDressingFrequency} />
    <Field label="Produtos planejados (um por linha)" value={products} onChangeText={setProducts} multiline />
    <Field label="Orientações ao paciente e a quem cuida dele" value={instructions} onChangeText={setInstructions} multiline />
    <Field label="Frequência de acompanhamento" value={followUpFrequency} onChangeText={setFollowUpFrequency} />
    <Field label="Data para revisar o plano (AAAA-MM-DD)" value={nextReviewDate} onChangeText={setNextReviewDate} placeholder="2026-12-31" />
    <Txt style={s.heading}>Metas que você vai acompanhar</Txt>
    {goals.map(goal => <View key={goal.id} style={s.section}><Txt style={s.body}>{goal.description}</Txt>{!!goal.targetDate && <Txt muted>Previsão: {goal.targetDate.split('-').reverse().join('/')}</Txt>}<Choices options={['Ativa', 'Atingida', 'Substituída', 'Cancelada']} value={goal.status} onChange={status => setGoals(previous => previous.map(g => g.id === goal.id ? updateGoalStatus(g, status as GoalStatus) : g))} /></View>)}
    {!goals.length && <Txt muted>Nenhuma meta específica adicionada.</Txt>}
    <Field label="Descrição da nova meta" value={goalDescription} onChangeText={setGoalDescription} /><Field label="Prazo da meta (AAAA-MM-DD, opcional)" value={goalDate} onChangeText={setGoalDate} />
    <Button title="Adicionar meta à edição" variant="outline" onPress={addGoal} />
    <Button title={source ? 'Salvar nova versão do plano' : 'Salvar plano de cuidados'} loading={busy} onPress={() => void save()} />
    {!!plans.length && <Accordion title={`Histórico do plano (${plans.length})`}>
      {plans.map(plan => <View key={plan.id} style={s.section}><Txt style={s.heading}>Versão {plan.version} · {new Date(plan.createdAt).toLocaleDateString('pt-BR')}</Txt><Txt style={s.body}>{plan.objectives || plan.clinicalGoal}</Txt>{!!plan.instructions && <Txt muted>{plan.instructions}</Txt>}<Txt muted>Produtos: {plan.plannedProducts.join(', ') || 'Não informados'}</Txt><Txt muted>Metas: {plan.goals.map(g => `${g.description} (${g.status})`).join('; ') || 'Não informadas'}</Txt></View>)}
    </Accordion>}
  </View>;
}
