import { useLocalSearchParams } from 'expo-router';
import { CareWizard } from '../../src/ui/CareWizard';
export default function NewCare() { const params = useLocalSearchParams<{ patientId?: string; woundId?: string; visitId?: string }>(); return <CareWizard visitId={Array.isArray(params.visitId) ? params.visitId[0] : params.visitId} patientId={Array.isArray(params.patientId) ? params.patientId[0] : params.patientId} woundId={Array.isArray(params.woundId) ? params.woundId[0] : params.woundId} />; }
