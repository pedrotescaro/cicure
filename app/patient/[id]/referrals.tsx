import { useLocalSearchParams } from 'expo-router';
import { UnavailableFeature } from '../../../src/ui/UnavailableFeature';

export default function ReferralsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <UnavailableFeature title="Encaminhamentos em preparação" description="O encaminhamento ainda não é salvo no prontuário nem entregue ao destino. Nenhum envio foi realizado." backTo={id ? `/patient/${id}` : '/patients'} />;
}
