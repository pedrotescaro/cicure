import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Button, Empty } from '../src/ui/components';
import { colors as c } from '../src/ui/theme';
export default function UnmatchedRoute() { const params = useLocalSearchParams<{ unmatched?: string[] }>(); const router = useRouter(); const value = Array.isArray(params.unmatched) ? params.unmatched.join('/') : params.unmatched ?? ''; useEffect(() => { if (value.includes('(tabs)')) router.replace('/'); }, [router, value]); if (value.includes('(tabs)')) return <View style={{ flex: 1, backgroundColor: c.bg }} />; return <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}><Empty title="Tela não encontrada" description="A rota solicitada não existe no Cicura." action="Voltar ao início" onPress={() => router.replace('/')} /></View>; }
