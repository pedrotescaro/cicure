import { useLocalSearchParams } from 'expo-router';
import PrescriptionBuilder from '../../../../src/features/prescription/ui/PrescriptionBuilder';

export default function EditPrescriptionRoute() {
  const { id, prescId, woundId } = useLocalSearchParams<{ id: string; prescId: string; woundId?: string }>();
  return <PrescriptionBuilder patientId={id || ''} prescriptionId={prescId} woundId={woundId} />;
}
