import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, Check, Clock, History, Target } from 'lucide-react-native';
import { useStore } from '../../../data/store';
import { Accordion, Badge, Button, Card, Choices, Empty, Field, IconButton, Label, SectionTitle, Txt, safeBack, s } from '../../../ui/components';
import { fonts, useTheme } from '../../../ui/theme';
import { productNames } from '../../../domain/clinical';
import { CarePlanGoalCard } from './CarePlanGoalCard';
import { createCarePlan, createGoal, reviseCarePlan, updateGoalStatus } from '../domain/care-plan.service';
import type { CarePlan, CarePlanGoal, GoalStatus } from '../domain/types';

export default function CarePlanScreen({ patientId }: { patientId: string }) {
  const router = useRouter();
  const store = useStore();
  const { colors } = useTheme();

  const patient = useStore(st => st.data.patients.find(p => p.id === patientId));
  const wounds = useStore(st => st.data.wounds.filter(w => w.patientId === patientId));
  const activeWound = wounds[0];

  // Armazenamento local de planos terapêuticos por ferida/paciente
  const [plans, setPlans] = useState<CarePlan[]>(() => {
    // Inicializa com um plano padrão caso não haja
    if (!activeWound) return [];
    return [
      createCarePlan({
        patientId,
        woundId: activeWound.id,
        objectives: 'Promover desbridamento autolítico e controle de exsudato',
        clinicalGoal: 'Redução de 30% da área em 4 semanas com estímulo à granulação',
        dressingFrequency: 'A cada 48 horas ou saturação secundária',
        plannedProducts: ['Hidrofibra com prata', 'Espuma de poliuretano'],
        complementaryTherapies: ['Fotobiomodulação'],
        instructions: 'Elevação do membro, higiene diária com SF 0,9%, não molhar curativo durante o banho.',
        followUpFrequency: 'Semanal',
        nextReviewDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      })
    ];
  });

  const activePlan = plans.find(p => p.status === 'Ativo') || plans[0];
  const historyPlans = plans.filter(p => p.id !== activePlan?.id);

  // Form states do plano ativo
  const [objectives, setObjectives] = useState(activePlan?.objectives || '');
  const [clinicalGoal, setClinicalGoal] = useState(activePlan?.clinicalGoal || '');
  const [dressingFrequency, setDressingFrequency] = useState(activePlan?.dressingFrequency || '');
  const [plannedProducts, setPlannedProducts] = useState<string[]>(activePlan?.plannedProducts || []);
  const [instructions, setInstructions] = useState(activePlan?.instructions || '');
  const [followUpFrequency, setFollowUpFrequency] = useState(activePlan?.followUpFrequency || '');
  const [nextReviewDate, setNextReviewDate] = useState(activePlan?.nextReviewDate || '');

  // Nova meta state
  const [newGoalDesc, setNewGoalDesc] = useState('');

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

  const handleAddGoal = () => {
    if (!newGoalDesc.trim() || !activePlan) return;
    const targetDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const goal = createGoal(activePlan.id, newGoalDesc.trim(), targetDate);
    
    setPlans(prev => prev.map(p => {
      if (p.id === activePlan.id) {
        return { ...p, goals: [...p.goals, goal] };
      }
      return p;
    }));
    setNewGoalDesc('');
  };

  const handleUpdateGoalStatus = (goalId: string, newStatus: GoalStatus) => {
    setPlans(prev => prev.map(p => {
      if (p.id === activePlan.id) {
        return {
          ...p,
          goals: p.goals.map(g => g.id === goalId ? updateGoalStatus(g, newStatus) : g)
        };
      }
      return p;
    }));
  };

  const handleSaveRevision = () => {
    if (!activePlan) return;
    const { updatedPrevious, newVersion } = reviseCarePlan(
      activePlan,
      {
        objectives,
        clinicalGoal,
        dressingFrequency,
        plannedProducts,
        instructions,
        followUpFrequency,
        nextReviewDate,
      },
      'Profissional autenticado'
    );

    setPlans(prev => [newVersion, ...prev.map(p => p.id === activePlan.id ? updatedPrevious : p)]);
    Alert.alert(
      'Plano Atualizado',
      `Nova versão v${newVersion.version} criada com sucesso. A versão anterior foi arquivada no histórico imutável.`
    );
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
        <Badge tone="green">v{activePlan?.version || 1} Ativo</Badge>
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
                onUpdateStatus={st => handleUpdateGoalStatus(g.id, st)}
                onUpdateProgress={prog => {
                  setPlans(prev => prev.map(p => p.id === activePlan.id ? {
                    ...p,
                    goals: p.goals.map(item => item.id === g.id ? { ...item, progress: prog } : item)
                  } : p));
                }}
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
              onPress={handleAddGoal} 
            />
          </View>
        </Card>

        {/* Parâmetros do Plano */}
        <Accordion title="Diretrizes e Prescrição Terapêutica" initialOpen={true}>
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
          title="Salvar revisão do plano" 
          icon={Check} 
          onPress={handleSaveRevision} 
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
