import { useLocalSearchParams } from 'expo-router';
import CarePlanScreen from '../../../src/features/care-plan/ui/CarePlanScreen';

export default function CarePlanRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CarePlanScreen patientId={id || ''} />;
}
