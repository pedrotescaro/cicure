import { useLocalSearchParams } from 'expo-router';
import PrescriptionBuilder from '../../../../src/features/prescription/ui/PrescriptionBuilder';

export default function NewPrescriptionRoute() {
  const { id, woundId } = useLocalSearchParams<{ id: string; woundId?: string }>();
  return <PrescriptionBuilder patientId={id || ''} woundId={woundId} />;
}
