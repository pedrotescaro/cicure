import { useLocalSearchParams } from 'expo-router';
import ReferralsScreen from '../../../src/features/referrals/ui/ReferralsScreen';

export default function ReferralsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReferralsScreen patientId={id || ''} />;
}
