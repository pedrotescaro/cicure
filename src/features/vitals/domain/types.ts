export type VitalSigns = {
  id: string;
  visitId?: string;
  patientId: string;
  bloodPressureSys?: string; // mmHg
  bloodPressureDia?: string; // mmHg
  heartRate?: string;        // bpm
  respiratoryRate?: string;  // irpm
  temperature?: string;      // °C
  spo2?: string;             // %
  capillaryGlucose?: string; // mg/dL
  weight?: string;           // kg
  recordedAt: string;
  recordedBy: string;
};

export type VascularAssessment = {
  id: string;
  visitId?: string;
  patientId: string;
  peripheralPulses: {
    pediosoDireito?: string;
    pediosoEsquerdo?: string;
    tibialPosteriorDireito?: string;
    tibialPosteriorEsquerdo?: string;
    popliteoDireito?: string;
    popliteoEsquerdo?: string;
  };
  perfusion: string;         // 'Adequada' | 'Lenta (>3s)' | 'Crítica'
  capillaryRefill: string;   // '< 3 segundos' | '3 a 5 segundos' | '> 5 segundos'
  edema: string;             // 'Ausente' | '1+/4+' | '2+/4+' | '3+/4+' | '4+/4+'
  limbTemperature: string;   // 'Normotérmico' | 'Frio' | 'Aquecido'
  sensitivity: string;       // 'Preservada' | 'Diminuída' | 'Ausente'
  monofilamentTest: string;  // 'Sem perda protetora' | 'Perda de sensibilidade protetora'
  customFields?: Record<string, string>;
  recordedAt: string;
  recordedBy: string;
};
