import type { Patient, Wound, Visit } from '../../../domain/types';
import type { ClinicalAlert } from './types';
import { area, change, decimal, stagnant } from '../../../domain/clinical';

export const ALERT_RULES_VERSION = '2026.1';

/**
 * Avalia o conjunto de dados clínicos registrados e retorna alertas
 * como suporte à decisão do profissional.
 */
export function evaluateClinicalAlerts(
  patient: Patient,
  wounds: Wound[],
  visits: Visit[],
  selectedProducts: string[] = []
): ClinicalAlert[] {
  const alerts: ClinicalAlert[] = [];
  const now = new Date().toISOString().slice(0, 10);

  // 1. Alergia cadastrada vs Produto selecionado
  if (patient.allergies && patient.allergies.length > 0 && selectedProducts.length > 0) {
    const allergiesLower = patient.allergies.map(a => a.toLowerCase());
    selectedProducts.forEach(prod => {
      const prodLower = prod.toLowerCase();
      // Verificações comuns: Prata vs Alergia a Prata, Látex vs Fitas, etc.
      const match = allergiesLower.find(a => prodLower.includes(a) || (a.includes('prata') && prodLower.includes('prata')));
      if (match) {
        alerts.push({
          id: `alert-allergy-${prod}`,
          type: 'alergia_produto',
          severity: 'urgente',
          title: 'Alerta de Hipersensibilidade / Alergia',
          message: `O paciente possui alergia registrada a "${match}" e o produto "${prod}" foi selecionado.`,
          recommendation: 'Verifique se há contraindicação absoluta e considere cobertura alternativa hipoalergênica.',
          patientId: patient.id,
          ruleVersion: ALERT_RULES_VERSION,
          createdAt: new Date().toISOString()
        });
      }
    });
  }

  // Avaliações por ferida
  wounds.forEach(wound => {
    const woundVisits = visits
      .filter(v => v.woundId === wound.id && v.state === 'Concluído')
      .sort((a, b) => b.date.localeCompare(a.date));

    // 2. Sinais de Infecção Marcados pelo Profissional
    if (woundVisits.length > 0) {
      const latest = woundVisits[0];
      if (latest.infection && latest.infection.length >= 2) {
        alerts.push({
          id: `alert-inf-${wound.id}`,
          type: 'sinais_infeccao',
          severity: 'urgente',
          title: 'Sinais Sugestivos de Infecção Local',
          message: `Foram assinalados múltiplos sinais flogísticos em ${wound.location}: ${latest.infection.join(', ')}.`,
          recommendation: 'Avalie necessidade de desbridamento, cobertura antimicrobiana (ex: prata/PHMB) e investigação sistêmica conforme protocolos clínicos.',
          patientId: patient.id,
          woundId: wound.id,
          ruleVersion: ALERT_RULES_VERSION,
          createdAt: new Date().toISOString()
        });
      }

      // 3. Alteração relevante da área da ferida (aumento > 20%)
      if (woundVisits.length >= 2) {
        const currentArea = area(latest);
        const previousArea = area(woundVisits[1]);
        if (currentArea > 0 && previousArea > 0) {
          const diff = change(currentArea, previousArea);
          if (diff.percent && diff.percent > 20) {
            alerts.push({
              id: `alert-area-${wound.id}`,
              type: 'alteracao_area',
              severity: 'aviso',
              title: 'Aumento Significativo da Área',
              message: `A área da ferida aumentou ${Math.round(diff.percent)}% em relação à medição anterior (${previousArea.toFixed(1)} cm² → ${currentArea.toFixed(1)} cm²).`,
              recommendation: 'Investigue compressão inadequada, descompensação sistêmica, trauma recente ou infecção subjacente.',
              patientId: patient.id,
              woundId: wound.id,
              ruleVersion: ALERT_RULES_VERSION,
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      // 4. Múltiplos atendimentos sem melhora (estagnação)
      if (woundVisits.length >= 4 && stagnant(woundVisits)) {
        alerts.push({
          id: `alert-stag-${wound.id}`,
          type: 'sem_melhora',
          severity: 'aviso',
          title: 'Ferida Estagnada (4+ Consultas Sem Redução)',
          message: `A lesão em ${wound.location} mantém área estável ou sem contração há 4 avaliações consecutivas.`,
          recommendation: 'Considere reavaliação etiológica, biópsia se suspeita de malignidade, ou incorporação de terapias complementares (fotobiomodulação, desbridamento cirúrgico).',
          patientId: patient.id,
          woundId: wound.id,
          ruleVersion: ALERT_RULES_VERSION,
          createdAt: new Date().toISOString()
        });
      }

      // 5. Retorno atrasado
      if (latest.returnDate && latest.returnDate < now) {
        alerts.push({
          id: `alert-return-${wound.id}`,
          type: 'retorno_atrasado',
          severity: 'aviso',
          title: 'Retorno Clínico Atrasado',
          message: `O retorno estava programado para ${latest.returnDate} e não foi registrado novo atendimento.`,
          recommendation: 'Entre em contato com o paciente ou cuidador para reagendamento e prevenção de descontinuidade do curativo.',
          patientId: patient.id,
          woundId: wound.id,
          ruleVersion: ALERT_RULES_VERSION,
          createdAt: new Date().toISOString()
        });
      }

      // 6. Necessidade de reavaliação de escala (se última aplicação > 30 dias)
      const lastWIfI = latest.assessments?.find(a => a.code === 'WIfI');
      if (wound.etiology === 'Pé diabético' && (!lastWIfI || (Date.now() - Date.parse(latest.date)) > 30 * 86400000)) {
        alerts.push({
          id: `alert-scale-${wound.id}`,
          type: 'reavaliacao_escala',
          severity: 'info',
          title: 'Reavaliação de Escala WIfI Recomendada',
          message: 'Lesões de etiologia Pé Diabético requerem acompanhamento periódico do risco de amputação via escala WIfI.',
          recommendation: 'Reaplique a escala WIfI nesta consulta para atualizar o estadiamento clínico.',
          patientId: patient.id,
          woundId: wound.id,
          ruleVersion: ALERT_RULES_VERSION,
          createdAt: new Date().toISOString()
        });
      }
    }
  });

  return alerts;
}
