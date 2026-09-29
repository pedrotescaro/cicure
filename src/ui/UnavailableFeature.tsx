import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { View } from 'react-native';
import { Button, Empty, safeBack } from './components';
import { useTheme } from './theme';

export function UnavailableFeature({
  title,
  description,
  backTo = '/more',
}: {
  title: string;
  description: string;
  backTo?: string;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.bg }}>
      <Empty title={title} description={description} />
      <Button title="Voltar" icon={ChevronLeft} variant="outline" onPress={() => safeBack(router, backTo)} />
    </View>
  );
}
