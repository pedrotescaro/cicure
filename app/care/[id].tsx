import { useLocalSearchParams } from 'expo-router';
import { VisitSummary } from '../../src/ui/VisitSummary';
export default function ExistingCare() { const { id } = useLocalSearchParams<{ id: string }>(); return <VisitSummary visitId={Array.isArray(id) ? id[0] : id} />; }
