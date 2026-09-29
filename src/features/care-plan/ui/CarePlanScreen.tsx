import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, Check } from 'lucide-react-native';
import { useStore } from '../../../data/store';
import { Accordion, Badge, Button, Card, Choices, Empty, Field, IconButton, Label, SectionTitle, Txt, safeBack, s } from '../../../ui/components';
import { fonts, useTheme } from '../../../ui/theme';
import { productNames } from '../../../domain/clinical';
import type { Patient, Wound } from '../../../domain/types';
import { CarePlanGoalCard } from './CarePlanGoalCard';
import { createCarePlan, createGoal, reviseCarePlan, updateGoalStatus } from '../domain/care-plan.service';
import type { CarePlan, GoalStatus } from '../domain/types';

export default function CarePlanScreen({ patientId }: { patientId: string }) {
  const router = useRouter();
  const store = useStore();
  const { colors } = useTheme();

  const patient = useStore(st => st.data.patients.find(p => p.id === patientId));
  const wounds = useStore(st => st.data.wounds).filter(w => w.patientId === patientId);
  const activeWound = wounds[0];

  const plans = useStore(st => st.data.care_plans).filter(p => p.patientId === patientId && p.woundId === activeWound?.id);
  const [draftPlan] = useState<CarePlan | null>(() => activeWound && store.authUserId ? createCarePlan({
    patientId,
    woundId: activeWound.id,
    createdBy: store.authUserId,
  }) : null);

  const activePlan = plans.find(p => p.status === 'Ativo') || plans[0] || draftPlan;
  const savedPlan = Boolean(activePlan && plans.some(p => p.id === activePlan.id));

  if (!patient || !activeWound) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Empty 
          title="Paciente ou ferida não encontrada" 
          description="O plano terapêutico requer uma ferida cadastrada."
          action="Voltar"
          onPress={() => safeBack(router, patientId ? `/patient/${patientId}` : '/patients')}
        />
      </View>
    );
  }

  if (!activePlan) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Empty title="Plano indisponível" description="Entre na sua conta e tente novamente." action="Voltar" onPress={() => safeBack(router, `/patient/${patientId}`)} />
      </View>
    );
  }

  return <CarePlanEditor key={activePlan.id} patientId={patientId} patient={patient} activeWound={activeWound} plans={plans} activePlan={activePlan} savedPlan={savedPlan} />;
}

function CarePlanEditor({ patientId, patient, activeWound, plans, activePlan, savedPlan }: {
  patientId: string;
  patient: Patient;
  activeWound: Wound;
  plans: CarePlan[];
  activePlan: CarePlan;
  savedPlan: boolean;
}) {
  const router = useRouter();
  const store = useStore();
  const { colors } = useTheme();
  const historyPlans = plans.filter(p => p.id !== activePlan.id);
  const [objectives, setObjectives] = useState(activePlan.objectives);
  const [clinicalGoal, setClinicalGoal] = useState(activePlan.clinicalGoal);
  const [dressingFrequency, setDressingFrequency] = useState(activePlan.dressingFrequency);
  const [plannedProducts, setPlannedProducts] = useState<string[]>(activePlan.plannedProducts);
  const [instructions, setInstructions] = useState(activePlan.instructions);
  const [followUpFrequency, setFollowUpFrequency] = useState(activePlan.followUpFrequency);
  const [nextReviewDate, setNextReviewDate] = useState(activePlan.nextReviewDate);
  const [newGoalDesc, setNewGoalDesc] = useState('');

  const handleAddGoal = async () => {
    if (!newGoalDesc.trim()) return;
    if (!savedPlan) { Alert.alert('Salve o plano primeiro', 'Depois de salvar o plano, você poderá adicionar metas.'); return; }
    try {
      const goal = createGoal(activePlan.id, newGoalDesc.trim(), '');
      await store.save('care_plans', { ...activePlan, goals: [...activePlan.goals, goal], updatedAt: new Date().toISOString() });
      setNewGoalDesc('');
    } catch { Alert.alert('Meta não salva', 'Tente novamente.'); }
  };

  const handleUpdateGoalStatus = async (goalId: string, newStatus: GoalStatus) => {
    try {
      await store.save('care_plans', {
        ...activePlan,
        goals: activePlan.goals.map(g => g.id === goalId ? updateGoalStatus(g, newStatus) : g),
        updatedAt: new Date().toISOString(),
      });
    } catch { Alert.alert('Meta não atualizada', 'Tente novamente.'); }
  };

  const handleSaveRevision = async () => {
    if (!objectives.trim() && !clinicalGoal.trim()) {
      Alert.alert('Plano incompleto', 'Descreva ao menos um objetivo ou uma meta clínica antes de salvar.');
      return;
    }
    const updates = { objectives: objectives.trim(), clinicalGoal: clinicalGoal.trim(), dressingFrequency: dressingFrequency.trim(), plannedProducts, instructions: instructions.trim(), followUpFrequency: followUpFrequency.trim(), nextReviewDate: nextReviewDate.trim() };
    try {
      if (!savedPlan) {
        await store.save('care_plans', { ...activePlan, ...updates, updatedAt: new Date().toISOString() });
        Alert.alert('Plano salvo', 'O plano foi salvo no aparelho e entrou na fila de sincronização.');
      } else {
        const { updatedPrevious, newVersion } = reviseCarePlan(activePlan, updates, store.authUserId || '');
        await store.save('care_plans', updatedPrevious);
        await store.save('care_plans', newVersion);
        Alert.alert('Revisão salva', `A versão ${newVersion.version} foi criada e entrou na fila de sincronização.`);
      }
    } catch { Alert.alert('Plano não salvo', 'Verifique o armazenamento e tente novamente.'); }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <IconButton icon={ChevronLeft} label="Voltar" onPress={() => safeBack(router, patientId ? `/patient/${patientId}` : '/patients')} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={styles.headerTitle}>Plano Terapêutico</Txt>
          <Txt muted style={{ fontSize: 13 }}>{patient.name} · {activeWound.location}</Txt>
        </View>
        <Badge tone={savedPlan && activePlan.status === 'Ativo' ? 'green' : 'neutral'}>{savedPlan ? `v${activePlan.version} ${activePlan.status}` : 'Novo plano'}</Badge>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Metas Clínicas */}
        <Card>
          <SectionTitle title="METAS DO TRATAMENTO" />
          <Txt muted style={{ fontSize: 13, lineHeight: 18 }}>
            Acompanhe o progresso individual de cada desfecho esperado para a lesão.
          </Txt>

          {activePlan?.goals && activePlan.goals.length > 0 ? (
            activePlan.goals.map(g => (
              <CarePlanGoalCard 
                key={g.id} 
                goal={g} 
                onUpdateStatus={st => { void handleUpdateGoalStatus(g.id, st); }}
              />
            ))
          ) : (
            <Txt muted style={{ fontStyle: 'italic', fontSize: 13, paddingVertical: 8 }}>
              Nenhuma meta específica cadastrada ainda.
            </Txt>
          )}

          {/* Adicionar Meta */}
          <View style={{ gap: 8, marginTop: 4 }}>
            <Field 
              label="Nova Meta" 
              placeholder="Ex.: Reduzir exsudato purulento em 7 dias"
              value={newGoalDesc}
              onChangeText={setNewGoalDesc}
            />
            <Button 
              title="Adicionar meta" 
              icon={Plus} 
              variant="outline" 
              small 
              onPress={() => { void handleAddGoal(); }}
            />
          </View>
        </Card>

        {/* Parâmetros do Plano */}
        <Accordion title="Diretrizes do plano" initialOpen={true}>
          <Field 
            label="Objetivos do Tratamento" 
            multiline 
            value={objectives} 
            onChangeText={setObjectives}
            placeholder="Ex.: Controle de biofilme, desbridamento enzimático e preparo do leito" 
          />
          <Field 
            label="Meta Clínica Geral" 
            value={clinicalGoal} 
            onChangeText={setClinicalGoal}
            placeholder="Ex.: Epitelização de bordas em 6 semanas" 
          />
          <Field 
            label="Frequência dos Curativos" 
            value={dressingFrequency} 
            onChangeText={setDressingFrequency}
            placeholder="Ex.: A cada 48 horas" 
          />

          <View style={{ gap: 8 }}>
            <Label>Produtos Planejados</Label>
            <Choices 
              options={productNames.slice(0, 10)} 
              value={plannedProducts} 
              onChange={setPlannedProducts} 
              multiple 
            />
          </View>

          <Field 
            label="Orientações ao Paciente e Cuidadores" 
            multiline 
            value={instructions} 
            onChangeText={setInstructions}
            placeholder="Ex.: Cuidados no banho, posicionamento, controle glicêmico" 
          />
          <Field 
            label="Frequência de Acompanhamento" 
            value={followUpFrequency} 
            onChangeText={setFollowUpFrequency}
            placeholder="Ex.: Semanalmente às terças-feiras" 
          />
          <Field 
            label="Previsão para Reavaliação Completa" 
            value={nextReviewDate} 
            onChangeText={setNextReviewDate}
            placeholder="AAAA-MM-DD" 
          />
        </Accordion>

        {/* Histórico de Versões do Plano */}
        {historyPlans.length > 0 && (
          <Accordion title={`Histórico de Versões (${historyPlans.length})`}>
            {historyPlans.map(hp => (
              <Card key={hp.id} style={{ gap: 6, marginBottom: 8 }}>
                <View style={s.between}>
                  <Txt style={{ fontFamily: fonts.semibold }}>Versão {hp.version}</Txt>
                  <Badge tone="neutral">{hp.status}</Badge>
                </View>
                <Txt muted style={{ fontSize: 12 }}>Criado em: {hp.createdAt.slice(0, 10)}</Txt>
                <Txt style={{ fontSize: 13 }}>Objetivos: {hp.objectives || 'Sem descrição'}</Txt>
                <Txt muted style={{ fontSize: 12 }}>Produtos: {hp.plannedProducts.join(', ') || 'Nenhum'}</Txt>
              </Card>
            ))}
          </Accordion>
        )}

        {/* Botão Salvar Nova Versão */}
        <Button 
          title={savedPlan ? 'Salvar nova versão' : 'Salvar plano'}
          icon={Check} 
          onPress={() => { void handleSaveRevision(); }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: fonts.brand, fontSize: 22 },
  content: { padding: 16, gap: 16, paddingBottom: 100 },
});
