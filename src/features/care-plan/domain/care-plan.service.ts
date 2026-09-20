import type { CarePlan, CarePlanGoal, GoalStatus } from './types';
import { uid } from '../../../data/store';

export function createCarePlan(params: {
  patientId: string;
  woundId: string;
  objectives?: string;
  clinicalGoal?: string;
  dressingFrequency?: string;
  plannedProducts?: string[];
  complementaryTherapies?: string[];
  instructions?: string;
  followUpFrequency?: string;
  nextReviewDate?: string;
  createdBy?: string;
}): CarePlan {
  const planId = uid();
  return {
    id: planId,
    patientId: params.patientId,
    woundId: params.woundId,
    objectives: params.objectives || '',
    clinicalGoal: params.clinicalGoal || '',
    dressingFrequency: params.dressingFrequency || '',
    plannedProducts: params.plannedProducts || [],
    complementaryTherapies: params.complementaryTherapies || [],
    instructions: params.instructions || '',
    followUpFrequency: params.followUpFrequency || '',
    nextReviewDate: params.nextReviewDate || '',
    version: 1,
    status: 'Ativo',
    goals: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: params.createdBy || 'Profissional'
  };
}

/**
 * Cria uma nova versão do plano terapêutico sem sobrescrever o anterior.
 * O plano anterior passa a ter status 'Revisado'.
 */
export function reviseCarePlan(
  previousPlan: CarePlan,
  updates: Partial<CarePlan>,
  revisedBy: string
): { updatedPrevious: CarePlan; newVersion: CarePlan } {
  const updatedPrevious: CarePlan = {
    ...previousPlan,
    status: 'Revisado',
    updatedAt: new Date().toISOString()
  };

  const newVersion: CarePlan = {
    ...previousPlan,
    ...updates,
    id: uid(),
    version: previousPlan.version + 1,
    status: 'Ativo',
    previousVersionId: previousPlan.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: revisedBy,
    // Preserva metas mas cria instâncias versionadas
    goals: (updates.goals || previousPlan.goals).map(g => ({
      ...g,
      carePlanId: previousPlan.id,
      updatedAt: new Date().toISOString()
    }))
  };

  return { updatedPrevious, newVersion };
}

export function createGoal(carePlanId: string, description: string, targetDate: string): CarePlanGoal {
  return {
    id: uid(),
    carePlanId,
    description,
    targetDate,
    status: 'Ativa',
    progress: 0,
    notes: '',
    updatedAt: new Date().toISOString()
  };
}

export function updateGoalStatus(goal: CarePlanGoal, status: GoalStatus, progress?: number): CarePlanGoal {
  let newProgress = progress !== undefined ? progress : goal.progress;
  if (status === 'Atingida') newProgress = 100;
  if (status === 'Cancelada') newProgress = 0;

  return {
    ...goal,
    status,
    progress: newProgress,
    updatedAt: new Date().toISOString()
  };
}
