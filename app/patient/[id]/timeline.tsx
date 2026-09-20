import { useLocalSearchParams } from 'expo-router';
import TimelineScreen from '../../../src/features/timeline/ui/TimelineScreen';

export default function TimelineRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TimelineScreen patientId={id || ''} />;
}
