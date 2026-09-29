import { useLocalSearchParams } from 'expo-router';
import { UnavailableFeature } from '../../../src/ui/UnavailableFeature';

export default function ConsentsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <UnavailableFeature title="Consentimentos em preparação" description="Os termos, assinaturas e revogações ainda não são persistidos nem auditados. Nenhuma autorização demonstrativa é válida para atendimento." backTo={id ? `/patient/${id}` : '/patients'} />;
}
