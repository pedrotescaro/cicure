import { useLocalSearchParams } from 'expo-router';
import TimelineScreen from '../../../src/features/timeline/ui/TimelineScreen';

export default function TimelineRoute() {
  const { id, woundId } = useLocalSearchParams<{ id: string; woundId?: string }>();
  return <TimelineScreen patientId={id || ''} initialWoundId={woundId} />;
}
