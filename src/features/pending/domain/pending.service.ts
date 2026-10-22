import type { Data } from '../../../domain/types';
import { buildAgendaEntries, localDay } from '../../agenda/domain/agenda.service';

export type PendingItem = {
  id: string;
  category: 'rascunho' | 'assinatura' | 'relatorio' | 'retorno' | 'dados_ausentes' | 'upload' | 'sync';
  title: string;
  description: string;
  severity: 'alta' | 'media' | 'baixa';
  route: string;
};

export function computePendingItems(data: Data, pendingSyncCount: number = 0): PendingItem[] {
  const items: PendingItem[] = [];
  const todayStr = localDay();

  // 1. Atendimentos em rascunho
  const drafts = data.visits.filter(v => !v.deletedAt && v.state === 'Rascunho');
  drafts.forEach(d => {
    const patient = data.patients.find(p => p.id === d.patientId);
    items.push({
      id: `draft-${d.id}`,
      category: 'rascunho',
      title: `Retomar atendimento: ${patient?.name || 'Paciente'}`,
      description: 'Atendimento iniciado e não finalizado. Retome para concluir.',
      severity: 'media',
      route: `/care/new?visitId=${d.id}`
    });
  });

  // 2. Registros aguardando assinatura
  const unsigned = data.visits.filter(v => !v.deletedAt && v.state === 'Concluído' && !v.completedBy && !v.signedBy);
  unsigned.forEach(u => {
    const patient = data.patients.find(p => p.id === u.patientId);
    items.push({
      id: `unsigned-${u.id}`,
      category: 'assinatura',
      title: `Autoria não identificada: ${patient?.name || 'Paciente'}`,
      description: 'Este registro antigo não identifica o profissional responsável. Abra para conferir o histórico.',
      severity: 'alta',
      route: `/care/${u.id}`
    });
  });

  // 3. Retornos atrasados
  buildAgendaEntries(data.visits).filter(entry => entry.kind === 'return').forEach(entry => {
    const v = entry.visit;
    if (entry.date < todayStr) {
      const patient = data.patients.find(p => p.id === v.patientId);
      items.push({
        id: `late-${v.id}`,
        category: 'retorno',
        title: `Conferir retorno: ${patient?.name || 'Paciente'}`,
        description: `Previsto para ${v.returnDate.split('-').reverse().join('/')}. Não há atendimento posterior concluído para esta ferida.`,
        severity: 'alta',
        route: `/patient/${patient?.id}`
      });
    }
  });

  // 4. Operações de sincronização pendentes
  if (pendingSyncCount > 0) {
    items.push({
      id: 'pending-sync-op',
      category: 'sync',
      title: `${pendingSyncCount} envios de dados pendentes`,
      description: 'Os registros salvos neste aparelho aguardam envio. Abra para conferir a conexão e tentar novamente.',
      severity: 'media',
      route: '/sync'
    });
  }

  // 5. Relatórios ainda não gerados para atendimentos concluídos
  data.visits.filter(v => !v.deletedAt && v.state === 'Concluído').forEach(v => {
    const hasReport = data.reports.some(r => r.visitId === v.id);
    if (!hasReport) {
      const patient = data.patients.find(p => p.id === v.patientId);
      items.push({
        id: `rep-missing-${v.id}`,
        category: 'relatorio',
        title: `Relatório não emitido: ${patient?.name || 'Paciente'}`,
        description: 'O atendimento foi concluído. Gere um relatório se precisar compartilhar o registro.',
        severity: 'baixa',
        route: `/care/${v.id}`
      });
    }
  });

  return items;
}
