export type CarePlanStatus = 'Ativo' | 'Revisado' | 'Cancelado';
export type GoalStatus = 'Ativa' | 'Atingida' | 'Substituída' | 'Cancelada';

export type CarePlanGoal = {
  id: string;
  carePlanId: string;
  description: string;
  targetDate: string;
  status: GoalStatus;
  progress: number; // 0 to 100
  notes: string;
  updatedAt: string;
};

export type CarePlan = {
  id: string;
  patientId: string;
  woundId: string;
  objectives: string;
  clinicalGoal: string;
  dressingFrequency: string;
  plannedProducts: string[];
  complementaryTherapies: string[];
  instructions: string;
  followUpFrequency: string;
  nextReviewDate: string;
  version: number;
  status: CarePlanStatus;
  previousVersionId?: string;
  goals: CarePlanGoal[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};
