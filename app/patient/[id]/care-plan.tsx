import { useLocalSearchParams } from 'expo-router';
import { UnavailableFeature } from '../../../src/ui/UnavailableFeature';

export default function CarePlanRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <UnavailableFeature title="Plano terapêutico em preparação" description="Esta tela ainda não salva revisões no prontuário. Nenhuma conduta ou meta foi preenchida automaticamente." backTo={id ? `/patient/${id}` : '/patients'} />;
}
