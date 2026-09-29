import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useStore } from '../src/data/store';
import { Txt } from '../src/ui/components';
import { fonts, useTheme } from '../src/ui/theme';

export default function ProfessionalProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: c } = useTheme();
  const userId = useStore(s => s.authUserId);
  const profile = useStore(s => s.data.profiles[0]);
  const save = useStore(s => s.save);
  const [name, setName] = useState(profile?.name ?? '');
  const [council, setCouncil] = useState(profile?.council ?? '');
  const [registration, setRegistration] = useState(profile?.registration ?? '');
  const [specialty, setSpecialty] = useState(profile?.specialty ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!userId) { setError('Entre na sua conta para editar o perfil.'); return; }
    if (!name.trim() || !council.trim() || !registration.trim()) {
      setError('Preencha nome, conselho e registro profissional.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await save('profiles', {
        id: userId,
        name: name.trim(),
        council: council.trim(),
        registration: registration.trim(),
        specialty: specialty.trim(),
      });
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  const fields = [
    { label: 'Nome completo', value: name, change: setName, hint: 'Como consta no registro profissional' },
    { label: 'Conselho profissional', value: council, change: setCouncil, hint: 'Ex.: COREN' },
    { label: 'Número do registro', value: registration, change: setRegistration, hint: 'Número e UF, se aplicável' },
    { label: 'Especialidade', value: specialty, change: setSpecialty, hint: 'Opcional' },
  ];

  return <View style={{ flex: 1, backgroundColor: c.bg }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: Math.max(insets.top, 20), paddingBottom: insets.bottom + 32, paddingHorizontal: 20 }}>
      <View style={{ maxWidth: 560, width: '100%', alignSelf: 'center', gap: 22 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={24} color={c.text} />
        </Pressable>
        <View style={{ gap: 8 }}>
          <Txt accessibilityRole="header" style={{ fontFamily: fonts.semibold, fontSize: 27 }}>Perfil profissional</Txt>
          <Txt muted style={{ fontSize: 16, lineHeight: 23 }}>Confira os dados que identificam você nos registros.</Txt>
        </View>
        {fields.map(field => <View key={field.label} style={{ gap: 8 }}>
          <Txt style={{ fontFamily: fonts.semibold, fontSize: 16 }}>{field.label}</Txt>
          <TextInput accessibilityLabel={field.label} value={field.value} onChangeText={field.change} placeholder={field.hint} placeholderTextColor={c.secondary} style={{ minHeight: 54, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 16, color: c.text, backgroundColor: c.surface, fontSize: 17 }} />
        </View>)}
        {!!error && <Txt accessibilityRole="alert" style={{ color: c.red, fontSize: 16 }}>{error}</Txt>}
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void submit()} style={{ minHeight: 54, borderRadius: 14, backgroundColor: c.red, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}>
          {busy ? <ActivityIndicator color="#fff" /> : <Txt style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 17 }}>Salvar perfil</Txt>}
        </Pressable>
      </View>
    </ScrollView>
  </View>;
}
