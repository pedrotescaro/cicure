import { CicureWordmark } from '../../src/ui/brand/CicureWordmark';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BarChart3, Building2, ChevronRight, EyeOff, HelpCircle, History, Lock, LogOut, Package, RefreshCw, Sparkles, UserRound, Users, type LucideIcon } from 'lucide-react-native';
import { Badge, Button, Card, Choices, SectionTitle, Txt, s } from '../../src/ui/components';
import { fonts, useTheme } from '../../src/ui/theme';
import { useStore, type ThemeMode } from '../../src/data/store';
import { useNetworkStatus } from '../../src/data/network';
import { cloudConfigured } from '../../src/data/supabase';
import { OnboardingModal } from '../../src/features/onboarding/ui/OnboardingModal';
import { authErrorMessage, signOut } from '../../src/features/auth/auth';
import { useTabContentInset } from '../../src/ui/navigation/useTabContentInset';

export default function More() {
  const router = useRouter();
  const bottomInset = useTabContentInset();
  const { colors: c, themeMode, setThemeMode } = useTheme();
  const profile = useStore(state => state.data.profiles[0]);
  const presentation = useStore(state => state.presentation);
  const setPresentation = useStore(state => state.setPresentation);
  const syncState = useStore(state => state.syncState);
  const { isOnline, pending } = useNetworkStatus();
  const [help, setHelp] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const exitAccount = () => Alert.alert('Sair da conta?', 'Os registros salvos continuam vinculados à sua conta. Você precisará entrar novamente para acessá-los.', [{ text: 'Continuar usando', style: 'cancel' }, { text: 'Sair', onPress: () => { setSigningOut(true); void signOut().catch(error => Alert.alert('Não foi possível sair', authErrorMessage(error))).finally(() => setSigningOut(false)); } }]);
  return <View style={{ flex: 1, backgroundColor: c.bg }}>
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: bottomInset, gap: 22 }}>
      <CicureWordmark size={32} />
      <Txt accessibilityRole="header" style={s.h1}>Menu</Txt>
      <View style={{ gap: 10 }}><SectionTitle title="Minha conta" />
        <Card style={{ gap: 8 }}><Txt style={s.h2}>{profile?.name || 'Seu perfil profissional'}</Txt><Txt muted>{profile ? [profile.specialty, profile.council, profile.registration].filter(Boolean).join(' · ') || 'Complete seu perfil para identificar seus registros' : 'Complete seu perfil para identificar seus registros'}</Txt><Button title="Editar perfil profissional" icon={UserRound} variant="outline" onPress={() => router.push('/profile')} /></Card>
        <MenuRow Icon={RefreshCw} title="Envio de dados" description={!cloudConfigured ? 'Salvo neste aparelho. Configure a nuvem para enviar.' : !isOnline ? 'Aguardando internet' : syncState === 'syncing' ? 'Enviando dados' : pending ? `${pending} envios pendentes` : syncState === 'synced' ? 'Dados enviados' : 'Salvo neste aparelho'} onPress={() => router.push('/sync')} />
        <Card><Txt style={s.h2}>Aparência</Txt><Choices options={['Usar sistema', 'Claro', 'Escuro']} value={themeMode === 'system' ? 'Usar sistema' : themeMode === 'light' ? 'Claro' : 'Escuro'} onChange={value => setThemeMode(({ 'Usar sistema': 'system', Claro: 'light', Escuro: 'dark' } as Record<string, ThemeMode>)[value])} /><Txt muted>O tamanho dos textos acompanha a configuração do seu aparelho.</Txt></Card>
      </View>
      <View style={{ gap: 10 }}><SectionTitle title="Segurança" />
        <MenuRow Icon={EyeOff} title="Modo apresentação" description="Oculta identificadores e protege a abertura de prontuários" badge={presentation ? 'Ativado' : 'Desativado'} onPress={() => setPresentation(!presentation)} />
        <MenuRow Icon={Lock} title="Acesso e dispositivos" description="Consultar a segurança da sua conta e deste aparelho" onPress={() => router.push('/security/sessions')} />
        <MenuRow Icon={History} title="Histórico de atividades" description="Consultar as ações registradas no aplicativo" onPress={() => router.push('/security/audit')} />
      </View>
      <View style={{ gap: 10 }}><SectionTitle title="Materiais" />
        <MenuRow Icon={Package} title="Estoque e lotes" description="Consultar materiais e registrar movimentações" onPress={() => router.push('/inventory')} />
        <MenuRow Icon={Sparkles} title="Modelos de atendimento" description="Consultar e organizar modelos de preenchimento" onPress={() => router.push('/templates')} />
        <MenuRow Icon={BarChart3} title="Indicadores" description="Consultar informações dos registros existentes" onPress={() => router.push('/indicators')} />
      </View>
      <View style={{ gap: 10 }}><SectionTitle title="Equipe" />
        <MenuRow Icon={Building2} title="Clínica ou equipe" description="Consultar sua organização e o modo de trabalho" onPress={() => router.push('/organization')} />
        <MenuRow Icon={Users} title="Pessoas e permissões" description="Consultar quem tem acesso à clínica" onPress={() => router.push('/organization/members')} />
      </View>
      <View style={{ gap: 10 }}><SectionTitle title="Ajuda" />
        <MenuRow Icon={HelpCircle} title="Como usar o Cicure" description="Rever o passo a passo das principais funções" onPress={() => setHelp(true)} />
        <MenuRow Icon={LogOut} title={signingOut ? 'Saindo da conta…' : 'Sair da conta'} description="Encerrar o acesso neste aparelho" onPress={() => { if (!signingOut) exitAccount(); }} />
      </View>
    </ScrollView>
    <OnboardingModal visible={help} onFinish={() => setHelp(false)} />
  </View>;
}

function MenuRow({ Icon, title, description, onPress, badge }: { Icon: LucideIcon; title: string; description: string; onPress: () => void; badge?: string }) {
  const { colors: c } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={description} onPress={onPress} style={[s.row, { minHeight: 80, paddingVertical: 16, borderBottomColor: c.border, borderBottomWidth: 1 }]}><Icon size={24} color={c.secondary} /><View style={{ flex: 1, gap: 6 }}><Txt style={{ fontFamily: fonts.semibold }}>{title}</Txt><Txt muted>{description}</Txt>{!!badge && <Badge>{badge}</Badge>}</View><ChevronRight size={22} color={c.secondary} /></Pressable>;
}
