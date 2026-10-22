import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useStore } from '../../../src/data/store';
import BodyMapView from '../../../src/features/body-map/ui/BodyMapView';
import { Empty } from '../../../src/ui/components';
import { useTheme } from '../../../src/ui/theme';

export default function BodyMapRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const presentation = useStore(state => state.presentation);
  const patient = useStore(st => st.data.patients.find(p => p.id === id));
  const wounds = useStore(st => st.data.wounds.filter(w => w.patientId === id));

  if (!patient) {
    return <View style={{ flex: 1, padding: 24, backgroundColor: colors.bg }}><Empty title="Paciente não encontrado" description="Volte à lista para selecionar um paciente." action="Voltar para pacientes" onPress={() => router.replace('/patients')} /></View>;
  }

  if (presentation) return <View style={{ flex: 1, padding: 24, backgroundColor: colors.bg }}><Empty title="Identificação protegida" description="Desative o modo apresentação no Menu para consultar o mapa corporal." action="Voltar para pacientes" onPress={() => router.replace('/patients')} /></View>;

  return <BodyMapView wounds={wounds} patientName={patient.name} />;
}
