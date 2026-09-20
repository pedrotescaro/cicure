import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useStore } from '../../../src/data/store';
import BodyMapView from '../../../src/features/body-map/ui/BodyMapView';
import { Empty } from '../../../src/ui/components';

export default function BodyMapRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const patient = useStore(st => st.data.patients.find(p => p.id === id));
  const wounds = useStore(st => st.data.wounds.filter(w => w.patientId === id));

  if (!patient) {
    return <View style={{ flex: 1, padding: 24 }}><Empty title="Paciente não encontrado" description="" /></View>;
  }

  return <BodyMapView wounds={wounds} patientName={patient.name} />;
}
