import { useLocalSearchParams } from 'expo-router';
import DocumentCenterScreen from '../../../src/features/documents/ui/DocumentCenterScreen';

export default function DocumentsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DocumentCenterScreen patientId={id || ''} />;
}
