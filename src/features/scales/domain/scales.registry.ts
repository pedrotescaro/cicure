import type { ClinicalScaleDefinition } from './types';

// Matriz oficial SVS WIfI para Risco de Amputação em 1 ano [Wound][Ischemia][footInfection]
// Wound: 0 a 3, Ischemia: 0 a 3, footInfection: 0 a 3
// Valores de estágio: 1 a 4 (Very low, Low, Moderate, High)
const SVS_WIFI_AMPUTATION_STAGE: number[][][] = [
  // Wound 0
  [
    [1, 1, 2, 3], // Ischemia 0, fI 0-3
    [1, 2, 3, 4], // Ischemia 1, fI 0-3
    [2, 3, 4, 4], // Ischemia 2, fI 0-3
    [3, 4, 4, 4]  // Ischemia 3, fI 0-3
  ],
  // Wound 1
  [
    [1, 1, 2, 3], // Ischemia 0, fI 0-3
    [1, 2, 3, 4], // Ischemia 1, fI 0-3
    [2, 3, 4, 4], // Ischemia 2, fI 0-3
    [3, 4, 4, 4]  // Ischemia 3, fI 0-3
  ],
  // Wound 2
  [
    [1, 2, 3, 4], // Ischemia 0, fI 0-3
    [2, 3, 4, 4], // Ischemia 1, fI 0-3
    [3, 4, 4, 4], // Ischemia 2, fI 0-3
    [4, 4, 4, 4]  // Ischemia 3, fI 0-3
  ],
  // Wound 3
  [
    [2, 3, 4, 4], // Ischemia 0, fI 0-3
    [3, 4, 4, 4], // Ischemia 1, fI 0-3
    [4, 4, 4, 4], // Ischemia 2, fI 0-3
    [4, 4, 4, 4]  // Ischemia 3, fI 0-3
  ]
];

export const SCALES_REGISTRY: Record<string, ClinicalScaleDefinition> = {
  // 1. WIfI (Society for Vascular Surgery 2019)
  WIfI: {
    code: 'WIfI',
    name: 'Classificação WIfI (Wound, Ischemia, foot Infection)',
    version: 'SVS 2019',
    description: 'Estratificação de risco de amputação em membros inferiores com feridas.',
    references: 'Mills JL, et al. The Society for Vascular Surgery Lower Extremity Threatened Limb Classification System. J Vasc Surg. 2014.',
    questions: [
      {
        id: 'wound',
        title: 'Wound (Extensão e Profundidade da Ferida)',
        options: [
          { label: '0: Sem úlcera (apenas dor isquêmica de repouso)', value: 0 },
          { label: '1: Úlcera rasa e pequena no terço distal sem gangrena', value: 1 },
          { label: '2: Úlcera profunda com exposição de tendão/osso ou gangrena em dedos', value: 2 },
          { label: '3: Úlcera extensa/profunda envolvendo mediopé ou retropé com gangrena extensa', value: 3 }
        ]
      },
      {
        id: 'ischemia',
        title: 'Ischemia (Grau de Isquemia Arterial)',
        options: [
          { label: '0: ITB ≥ 0.80 / Pressão no hálux > 60 mmHg', value: 0 },
          { label: '1: ITB 0.60–0.79 / Pressão no hálux 40–59 mmHg', value: 1 },
          { label: '2: ITB 0.40–0.59 / Pressão no hálux 30–39 mmHg', value: 2 },
          { label: '3: ITB < 0.40 / Pressão no hálux < 30 mmHg', value: 3 }
        ]
      },
      {
        id: 'footInfection',
        title: 'foot Infection (Infecção do Pé Diabético / Lesão)',
        options: [
          { label: '0: Sem sinais locais ou sistêmicos de infecção', value: 0 },
          { label: '1: Infecção leve (celulite < 2 cm na margem)', value: 1 },
          { label: '2: Infecção moderada (celulite > 2 cm, abscesso profundo, osteomielite)', value: 2 },
          { label: '3: Infecção grave (SIRS / instabilidade hemodinâmica)', value: 3 }
        ]
      }
    ],
    calculate: (answers) => {
      const w = Math.min(3, Math.max(0, answers.wound ?? 0));
      const i = Math.min(3, Math.max(0, answers.ischemia ?? 0));
      const fi = Math.min(3, Math.max(0, answers.footInfection ?? 0));
      
      const stage = SVS_WIFI_AMPUTATION_STAGE[w][i][fi];

      const riskLabels: Record<number, string> = {
        1: 'Estágio 1: Muito baixo risco de amputação em 1 ano',
        2: 'Estágio 2: Baixo risco de amputação em 1 ano',
        3: 'Estágio 3: Risco moderado de amputação — considerar revascularização',
        4: 'Estágio 4: Alto risco de amputação — intervenção vascular urgente requerida'
      };

      return {
        score: stage,
        stage: `Estágio Clínico ${stage}`,
        interpretation: riskLabels[stage] || 'Avaliação clínica especializada recomendada'
      };
    }
  },

  // 2. PUSH (Pressure Ulcer Scale for Healing)
  PUSH: {
    code: 'PUSH',
    name: 'Escala PUSH (Pressure Ulcer Scale for Healing)',
    version: '3.0 NPUAP',
    description: 'Monitoramento contínuo da cicatrização de lesões por pressão.',
    references: 'National Pressure Injury Advisory Panel (NPIAP) PUSH Tool v3.0.',
    questions: [
      {
        id: 'area',
        title: 'Sub-escala de Área (Comprimento × Largura em cm²)',
        options: [
          { label: '0: 0 cm²', value: 0 },
          { label: '1: < 0.3 cm²', value: 1 },
          { label: '2: 0.3 a 0.6 cm²', value: 2 },
          { label: '3: 0.7 a 1.0 cm²', value: 3 },
          { label: '4: 1.1 a 2.0 cm²', value: 4 },
          { label: '5: 2.1 a 3.0 cm²', value: 5 },
          { label: '6: 3.1 a 4.0 cm²', value: 6 },
          { label: '7: 4.1 a 8.0 cm²', value: 7 },
          { label: '8: 8.1 a 12.0 cm²', value: 8 },
          { label: '9: 12.1 a 24.0 cm²', value: 9 },
          { label: '10: > 24.0 cm²', value: 10 }
        ]
      },
      {
        id: 'exudate',
        title: 'Quantidade de Exsudato',
        options: [
          { label: '0: Nenhum', value: 0 },
          { label: '1: Leve / Pequena', value: 1 },
          { label: '2: Moderada', value: 2 },
          { label: '3: Abundante / Grande', value: 3 }
        ]
      },
      {
        id: 'tissueType',
        title: 'Tipo de Tecido Predominante',
        options: [
          { label: '0: Ferida fechada / cicatrizada', value: 0 },
          { label: '1: Epitelização', value: 1 },
          { label: '2: Granulação', value: 2 },
          { label: '3: Esfacelo', value: 3 },
          { label: '4: Necrose / Escara', value: 4 }
        ]
      }
    ],
    calculate: (answers) => {
      const a = answers.area ?? 0;
      const e = answers.exudate ?? 0;
      const t = answers.tissueType ?? 0;
      const total = a + e + t;

      let interpretation = 'Lesão em processo de regeneração tecidual.';
      if (total <= 5) interpretation = 'Excelente prognóstico / Cicatrização avançada.';
      else if (total > 12) interpretation = 'Lesão extensa com alta carga de esfacelo/exsudato.';

      return {
        score: total,
        interpretation
      };
    }
  },

  // 3. Braden (Risco de Lesão por Pressão)
  Braden: {
    code: 'Braden',
    name: 'Escala de Braden',
    version: '1987 Oficial',
    description: 'Avaliação de risco para desenvolvimento de lesões por pressão.',
    references: 'Bergstrom N, et al. The Braden Scale for Predicting Pressure Sore Risk. Nurs Res. 1987.',
    questions: [
      {
        id: 'sensory',
        title: 'Percepção Sensorial',
        options: [
          { label: '1: Totalmente limitado', value: 1 },
          { label: '2: Muito limitado', value: 2 },
          { label: '3: Levemente limitado', value: 3 },
          { label: '4: Nenhuma limitação', value: 4 }
        ]
      },
      {
        id: 'moisture',
        title: 'Umidade',
        options: [
          { label: '1: Constantemente úmida', value: 1 },
          { label: '2: Muito úmida', value: 2 },
          { label: '3: Ocasionalmente úmida', value: 3 },
          { label: '4: Raramente úmida', value: 4 }
        ]
      },
      {
        id: 'activity',
        title: 'Atividade Física',
        options: [
          { label: '1: Acamado', value: 1 },
          { label: '2: Confinado à cadeira', value: 2 },
          { label: '3: Caminha ocasionalmente', value: 3 },
          { label: '4: Caminha frequentemente', value: 4 }
        ]
      },
      {
        id: 'mobility',
        title: 'Mobilidade no Leito',
        options: [
          { label: '1: Totalmente imóvel', value: 1 },
          { label: '2: Bastante limitado', value: 2 },
          { label: '3: Levemente limitado', value: 3 },
          { label: '4: Nenhuma limitação', value: 4 }
        ]
      },
      {
        id: 'nutrition',
        title: 'Nutrição',
        options: [
          { label: '1: Muito pobre', value: 1 },
          { label: '2: Provavelmente inadequada', value: 2 },
          { label: '3: Adequada', value: 3 },
          { label: '4: Excelente', value: 4 }
        ]
      },
      {
        id: 'friction',
        title: 'Fricção e Cisalhamento',
        options: [
          { label: '1: Problema', value: 1 },
          { label: '2: Problema potencial', value: 2 },
          { label: '3: Nenhum problema aparente', value: 3 }
        ]
      }
    ],
    calculate: (answers) => {
      const s = answers.sensory ?? 4;
      const u = answers.moisture ?? 4;
      const a = answers.activity ?? 4;
      const m = answers.mobility ?? 4;
      const n = answers.nutrition ?? 4;
      const f = answers.friction ?? 3;
      const score = s + u + a + m + n + f;

      let interpretation = 'Sem risco identificado (Score ≥ 19)';
      if (score <= 9) interpretation = 'Risco Gravíssimo de LPP (Score ≤ 9)';
      else if (score <= 12) interpretation = 'Alto Risco de LPP (Score 10 a 12)';
      else if (score <= 14) interpretation = 'Risco Moderado de LPP (Score 13 a 14)';
      else if (score <= 18) interpretation = 'Baixo Risco de LPP (Score 15 a 18)';

      return { score, interpretation };
    }
  },

  // 4. Wagner (Pé Diabético)
  Wagner: {
    code: 'Wagner',
    name: 'Classificação de Wagner (Pé Diabético)',
    version: '1981',
    description: 'Estadiamento de úlceras no pé diabético.',
    references: 'Wagner FW. The dysvascular foot: a system for diagnosis and treatment. Foot Ankle. 1981.',
    questions: [
      {
        id: 'grau',
        title: 'Grau da Lesão no Pé',
        options: [
          { label: 'Grau 0: Pé de risco sem úlcera aberta', value: 0 },
          { label: 'Grau 1: Úlcera superficial sem acometimento de tecidos profundos', value: 1 },
          { label: 'Grau 2: Úlcera profunda com exposição de tendão, ligamento ou cápsula articular', value: 2 },
          { label: 'Grau 3: Úlcera profunda com celulite extensa, abscesso ou osteomielite', value: 3 },
          { label: 'Grau 4: Gangrena localizada em antepé ou hálux', value: 4 },
          { label: 'Grau 5: Gangrena extensa de todo o pé', value: 5 }
        ]
      }
    ],
    calculate: (answers) => {
      const g = answers.grau ?? 0;
      const desc = [
        'Pé de risco: requer orientações profiláticas e calçados adaptados.',
        'Úlcera superficial: tratamento ambulatorial e alívio de pressão.',
        'Úlcera profunda: desbridamento e controle rigoroso de carga.',
        'Infecção profunda/osteomielite: hospitalização e antibioticoterapia guiada.',
        'Gangrena localizada: intervenção cirúrgica vascular imediata.',
        'Gangrena extensa: risco iminente de amputação maior.'
      ];
      return {
        score: g,
        stage: `Grau ${g}`,
        interpretation: desc[g] || 'Avaliação médica requerida.'
      };
    }
  }
};
