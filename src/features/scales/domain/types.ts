export type ScaleQuestion = {
  id: string;
  title: string;
  options: { label: string; value: number }[];
};

export type ClinicalScaleDefinition = {
  code: string;
  name: string;
  version: string;
  description: string;
  references: string;
  questions: ScaleQuestion[];
  calculate: (answers: Record<string, number>) => {
    score: number;
    interpretation: string;
    stage?: string;
  };
};
