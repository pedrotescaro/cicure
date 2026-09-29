import { useLocalSearchParams } from 'expo-router';
import PrivateDocumentCenterScreen from '../../../src/features/documents/ui/PrivateDocumentCenterScreen';

export default function DocumentsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PrivateDocumentCenterScreen patientId={id} />;
}
