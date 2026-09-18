import { useLocalSearchParams } from 'expo-router';
import { CareWizard } from '../../src/ui/CareWizard';
export default function NewCare() { const params = useLocalSearchParams<{ patientId?: string; woundId?: string }>(); return <CareWizard patientId={params.patientId} woundId={params.woundId} />; }
