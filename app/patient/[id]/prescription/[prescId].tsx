import { useLocalSearchParams } from 'expo-router';
import PrescriptionBuilder from '../../../../src/features/prescription/ui/PrescriptionBuilder';
export default function EditPrescriptionRoute() {
  const { id, prescId } = useLocalSearchParams<{ id: string; prescId: string }>();
  return <PrescriptionBuilder patientId={id} prescriptionId={prescId} />;
}
