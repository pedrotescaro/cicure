import { useTabContentInset } from '../../src/ui/navigation/useTabContentInset';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, View, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Building2, 
  ChevronRight, 
  EyeOff,
  Fingerprint, 
  HelpCircle, 
  History,
  Lock, 
  Moon, 
  Package, 
  RefreshCw, 
  ShieldCheck, 
  SlidersHorizontal, 
  Sparkles, 
  SunMedium,
  UserRound,
  BarChart3,
  User
} from 'lucide-react-native';
import { Card, SectionTitle, Txt, s, Badge, Button, IconButton } from '../../src/ui/components';
import { fonts, useTheme } from '../../src/ui/theme';
import { useStore } from '../../src/data/store';
import { useNetworkStatus } from '../../src/data/network';
import { cloudConfigured } from '../../src/data/supabase';
import { OnboardingModal } from '../../src/features/onboarding/ui/OnboardingModal';

export default function More() {
  const bottomInset = useTabContentInset();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors: c, isDark, themeMode, setThemeMode } = useTheme();
  const profile = useStore(st => st.data.profiles[0]);
  const presentation = useStore(st => st.presentation);
  const setPresentation = useStore(st => st.setPresentation);
  const workMode = useStore(st => st.workMode);
  const activeOrg = useStore(st => st.activeOrg);
  const { isOnline, pending } = useNetworkStatus();

  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const showLockUnavailable = () => Alert.alert('Bloqueio em preparação', 'Biometria e PIN ainda não protegem o acesso aos dados nesta versão.');

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView 
        contentContainerStyle={[
          styles.content, 
          { paddingHorizontal: width < 380 ? 16 : 20, paddingBottom: bottomInset }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Topbar Padronizada */}
        <View style={styles.topbar}>
          <Txt style={[styles.brand, { color: c.red }]}>cicure</Txt>
          <View style={s.row}>
            <IconButton 
              icon={ShieldCheck} 
              label="Segurança do app" 
              color={c.red} 
              onPress={showLockUnavailable}
            />
          </View>
        </View>

        {/* Título Padronizado */}
        <View style={{ gap: 2 }}>
          <Txt muted style={styles.sectionLabel}>CONFIGURAÇÕES & SEGURANÇA</Txt>
          <Txt style={s.h1}>Mais</Txt>
        </View>

        {/* Card do Perfil do Profissional */}
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}>
          <View style={[styles.profileAvatar, { backgroundColor: c.redSoft }]}>
            <UserRound size={24} color={c.red} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Txt style={{ fontFamily: fonts.semibold, fontSize: 16 }} numberOfLines={1}>
              {profile?.name || 'Profissional'}
            </Txt>
            <Txt muted style={{ fontSize: 12 }} numberOfLines={2}>
              {profile ? [profile.specialty, profile.council, profile.registration].filter(Boolean).join(' · ') : 'Perfil profissional não configurado'}
            </Txt>
          </View>
        </Card>

        {/* Seção Workspaces & Equipes (§1) */}
        <SectionTitle title="ORGANIZAÇÕES E EQUIPES" />
        <Card style={{ padding: 16, gap: 14, backgroundColor: workMode === 'individual' ? (isDark ? '#1F1F23' : '#FAF9F9') : (isDark ? '#261C1E' : '#FFFDFD'), borderColor: workMode === 'individual' ? c.border : (isDark ? '#4A2326' : '#F5C6C6') }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <View style={[styles.modeMiniAvatar, { backgroundColor: workMode === 'individual' ? (isDark ? '#2E2E34' : c.dark) : c.red }]}>
                {workMode === 'individual' ? <User size={16} color="#FFF" /> : <Building2 size={16} color="#FFF" />}
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Txt style={{ fontFamily: fonts.semibold, fontSize: 14 }} numberOfLines={1}>
                  {workMode === 'individual' ? 'Consultório Individual' : activeOrg.name}
                </Txt>
                <Txt muted style={{ fontSize: 11 }} numberOfLines={1}>
                  {workMode === 'individual' 
                    ? 'Espaço individual local'
                    : `Clínica compartilhada · ${activeOrg.inviteCode ? `Código ${activeOrg.inviteCode}` : 'Equipe multidisciplinar'}`}
                </Txt>
              </View>
            </View>
            <Badge>Local</Badge>
          </View>
          <Button 
            title="Sobre clínicas e equipes"
            variant="outline" 
            small 
            icon={Building2}
            onPress={() => router.push('/organization' as never)}
          />
        </Card>

        <Card style={styles.menuCard}>
          <MenuRow 
            icon={Building2} 
            title="Gerenciar Clínicas e Workspaces" 
            subtitle="Em preparação para a etapa de clínicas e equipes"
            onPress={() => router.push('/organization' as never)} 
          />
          <MenuRow 
            icon={SlidersHorizontal} 
            title="Membros e Permissões Granulares" 
            subtitle="Convites e permissões ainda indisponíveis"
            onPress={() => router.push('/organization/members' as never)} 
          />
        </Card>

        {/* Seção Aparência e Modo Escuro */}
        <SectionTitle title="APARÊNCIA & TEMA" />
        <Card style={styles.menuCard}>
          <View style={[styles.menuRow, { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 14, gap: 12, borderBottomColor: c.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, width: '100%' }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? '#2A241C' : '#FFF4E0', alignItems: 'center', justifyContent: 'center' }}>
                {isDark ? <Moon size={18} color="#FF4D4D" /> : <SunMedium size={18} color="#C77D00" />}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt style={{ fontFamily: fonts.semibold, fontSize: 14 }}>Modo de Exibição</Txt>
                <Txt muted style={{ fontSize: 12 }}>
                  {themeMode === 'system' ? 'Acompanha o sistema operacional' : themeMode === 'dark' ? 'Modo escuro ativado' : 'Modo claro ativado'}
                </Txt>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
              {(['system', 'light', 'dark'] as const).map(mode => {
                const active = themeMode === mode;
                const label = mode === 'system' ? 'Sistema' : mode === 'light' ? 'Claro' : 'Escuro';
                return (
                  <Pressable
                    key={mode}
                    onPress={() => setThemeMode(mode)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={{
                      flex: 1,
                      paddingVertical: 9,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: active ? (isDark ? '#2E2E34' : c.dark) : isDark ? '#232328' : '#F4F4F5',
                      borderWidth: 1,
                      borderColor: active ? (isDark ? '#4A4A52' : c.dark) : c.border,
                    }}
                  >
                    <Txt style={{ fontSize: 12, fontFamily: fonts.semibold, color: active ? '#FFF' : c.secondary }}>
                      {label}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <MenuRow 
            icon={EyeOff} 
            title="Modo Apresentação" 
            subtitle={presentation ? 'Identificadores reduzidos nesta tela' : 'Reduzir identificadores nas telas compatíveis'}
            onPress={() => setPresentation(!presentation)}
            toggleLabel={presentation ? 'Desativar' : 'Ativar'}
          />
          <MenuRow 
            icon={HelpCircle} 
            title="Tutorial e Onboarding" 
            subtitle="Rever o passo a passo das funcionalidades do Cicure"
            onPress={() => setOnboardingVisible(true)} 
          />
        </Card>

        {/* Seção Segurança Avançada (§2) */}
        <SectionTitle title="CENTRAL DE SEGURANÇA" />
        <Card style={styles.menuCard}>
          <MenuRow 
            icon={Fingerprint} 
            title="Bloqueio do Aplicativo (Biometria / PIN)" 
            subtitle="Biometria e PIN ainda indisponíveis"
            onPress={showLockUnavailable}
          />
          <MenuRow 
            icon={Lock} 
            title="Sessões Ativas e Dispositivos" 
            subtitle="Lista e revogação ainda indisponíveis"
            onPress={() => router.push('/security/sessions' as never)} 
          />
          <MenuRow 
            icon={History} 
            title="Trilha de Auditoria (Admin)" 
            subtitle="Persistência de auditoria ainda indisponível"
            onPress={() => router.push('/security/audit' as never)} 
          />
        </Card>

        {/* Seção Ferramentas Clínicas e Estoque (§6, §14, §17, §24) */}
        <SectionTitle title="GESTÃO E PROTOCOLOS" />
        <Card style={styles.menuCard}>
          <MenuRow 
            icon={BarChart3} 
            title="Indicadores Clínicos" 
            subtitle="Métricas clínicas ainda não validadas"
            onPress={() => router.push('/indicators' as never)} 
          />
          <MenuRow 
            icon={Package} 
            title="Controle de Estoque & Lotes" 
            subtitle="Controle de lotes e consumo ainda indisponível"
            onPress={() => router.push('/inventory' as never)} 
          />
          <MenuRow 
            icon={Sparkles} 
            title="Templates Clínicos" 
            subtitle="Protocolos e compartilhamento ainda indisponíveis"
            onPress={() => router.push('/templates' as never)} 
          />
          <MenuRow 
            icon={RefreshCw} 
            title="Central de Sincronização" 
            subtitle={!cloudConfigured ? 'Nuvem não configurada · registros somente locais' : isOnline ? (pending > 0 ? `Online · ${pending} alteração(ões) pendente(s)` : 'Fila local vazia · nuvem não verificada') : 'Offline · Armazenado no aparelho'}
            onPress={() => router.push('/sync' as never)} 
          />
        </Card>

        <Txt muted style={{ fontSize: 12, textAlign: 'center', marginTop: 8 }}>
          Cicure · Versão em desenvolvimento
        </Txt>
      </ScrollView>

      {/* Modal de Onboarding (§31) */}
      <OnboardingModal 
        visible={onboardingVisible}
        onFinish={() => setOnboardingVisible(false)}
      />

    </View>
  );
}

function MenuRow({
  icon: Icon,
  title,
  subtitle,
  onPress,
  toggleLabel
}: {
  icon: any;
  title: string;
  subtitle: string;
  onPress: () => void;
  toggleLabel?: string;
}) {
  const { colors: c } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.menuRow, { borderBottomColor: c.border }]}>
      <Icon size={20} color={c.secondary} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Txt style={{ fontFamily: fonts.semibold, fontSize: 14 }} numberOfLines={1}>{title}</Txt>
        <Txt muted style={{ fontSize: 12 }} numberOfLines={2}>{subtitle}</Txt>
      </View>
      {toggleLabel ? (
        <Badge tone="red">{toggleLabel}</Badge>
      ) : (
        <ChevronRight size={18} color={c.tertiary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 18, paddingBottom: 160, gap: 18 },
  topbar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontFamily: fonts.brand, fontSize: 26, letterSpacing: -0.8 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.4, fontFamily: fonts.semibold },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeMiniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCard: { gap: 0, padding: 0, overflow: 'hidden' },
  menuRow: {
    minHeight: 70,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: 1,
  }
});
