import type { Data } from '../../../domain/types';

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
  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. Atendimentos em rascunho
  const drafts = data.visits.filter(v => v.state === 'Rascunho');
  drafts.forEach(d => {
    const patient = data.patients.find(p => p.id === d.patientId);
    items.push({
      id: `draft-${d.id}`,
      category: 'rascunho',
      title: `Atendimento em Rascunho: ${patient?.name || 'Paciente'}`,
      description: 'Atendimento iniciado e não finalizado. Retome para concluir.',
      severity: 'media',
      route: `/care/new?visitId=${d.id}`
    });
  });

  // 2. Registros aguardando assinatura
  const unsigned = data.visits.filter(v => v.state === 'Concluído' && (!v.signature || v.signature.length === 0));
  unsigned.forEach(u => {
    const patient = data.patients.find(p => p.id === u.patientId);
    items.push({
      id: `unsigned-${u.id}`,
      category: 'assinatura',
      title: `Atendimento aguardando assinatura: ${patient?.name || 'Paciente'}`,
      description: 'A assinatura digital com carimbo de tempo é necessária para imutabilidade clínica.',
      severity: 'alta',
      route: `/care/${u.id}`
    });
  });

  // 3. Retornos atrasados
  data.visits.forEach(v => {
    if (v.returnDate && v.returnDate < todayStr && v.state === 'Concluído') {
      const patient = data.patients.find(p => p.id === v.patientId);
      items.push({
        id: `late-${v.id}`,
        category: 'retorno',
        title: `Retorno Atrasado: ${patient?.name || 'Paciente'}`,
        description: `Retorno estava previsto para ${v.returnDate}. Não há novo atendimento registrado.`,
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
      title: `${pendingSyncCount} Operação(ões) Offline Pendentes`,
      description: 'Registros armazenados localmente no SQLite aguardando conexão com a nuvem.',
      severity: 'media',
      route: '/sync'
    });
  }

  // 5. Relatórios ainda não gerados para atendimentos concluídos
  data.visits.filter(v => v.state === 'Concluído').slice(0, 2).forEach(v => {
    const hasReport = data.reports.some(r => r.visitId === v.id);
    if (!hasReport) {
      const patient = data.patients.find(p => p.id === v.patientId);
      items.push({
        id: `rep-missing-${v.id}`,
        category: 'relatorio',
        title: `Relatório não emitido: ${patient?.name || 'Paciente'}`,
        description: 'Atendimento concluído sem emissão de laudo técnico ou via do paciente.',
        severity: 'baixa',
        route: `/care/${v.id}`
      });
    }
  });

  return items;
}
