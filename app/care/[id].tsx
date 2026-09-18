import { useLocalSearchParams } from 'expo-router';
import { CareWizard } from '../../src/ui/CareWizard';
export default function ExistingCare() { const { id } = useLocalSearchParams<{ id: string }>(); return <CareWizard visitId={id} />; }
