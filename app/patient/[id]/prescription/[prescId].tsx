import { useLocalSearchParams } from 'expo-router';
import { UnavailableFeature } from '../../../../src/ui/UnavailableFeature';

export default function EditPrescriptionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <UnavailableFeature title="Prescrição em preparação" description="A assinatura e o salvamento no prontuário ainda não estão integrados. Não emita uma prescrição a partir desta versão." backTo={id ? `/patient/${id}` : '/patients'} />;
}
