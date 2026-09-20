import { useLocalSearchParams } from 'expo-router';
import ConsentCenterScreen from '../../../src/features/consents/ui/ConsentCenterScreen';

export default function ConsentsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ConsentCenterScreen patientId={id || ''} />;
}
