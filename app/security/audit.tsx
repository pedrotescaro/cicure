import { UnavailableFeature } from '../../src/ui/UnavailableFeature';

export default function AuditRoute() {
  return <UnavailableFeature title="Auditoria em preparação" description="Os eventos desta versão ainda não têm persistência confiável. Nenhum registro temporário deve ser tratado como trilha de auditoria." />;
}
