import { useLocalSearchParams } from 'expo-router';
import { UnavailableFeature } from '../../../src/ui/UnavailableFeature';

export default function DocumentsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <UnavailableFeature title="Documentos em preparação" description="Anexos ainda não têm transporte privado e persistência integrada ao prontuário. Nenhum documento demonstrativo representa um arquivo real." backTo={id ? `/patient/${id}` : '/patients'} />;
}
