import { useTabContentInset } from '../../src/ui/navigation/useTabContentInset';
import React, { useState } from 'react';
import { Pressable, ScrollView, View, StyleSheet, useWindowDimensions } from 'react-native';
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
import { AppLockModal } from '../../src/features/security/ui/AppLockModal';
import { OnboardingModal } from '../../src/features/onboarding/ui/OnboardingModal';
import { WorkspaceSelectorModal } from '../../src/features/organization/ui/WorkspaceSelectorModal';

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

  const [lockModalVisible, setLockModalVisible] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [workspaceModalVisible, setWorkspaceModalVisible] = useState(false);

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
              onPress={() => setLockModalVisible(true)} 
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
              {profile?.name || 'Caroline Ferreira'}
            </Txt>
            <Txt muted style={{ fontSize: 12 }} numberOfLines={2}>
              {profile?.specialty || 'Enfermagem Estomaterapeuta'} · {profile?.council || 'COREN'} {profile?.registration || '123456-SP'}
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
                    ? 'Prontuários privados e exclusivos' 
                    : `Clínica compartilhada · ${activeOrg.inviteCode ? `Código ${activeOrg.inviteCode}` : 'Equipe multidisciplinar'}`}
                </Txt>
              </View>
            </View>
            <Badge tone="green">Ativo</Badge>
          </View>
          <Button 
            title="Alternar Workspace" 
            variant="outline" 
            small 
            icon={Building2}
            onPress={() => setWorkspaceModalVisible(true)} 
          />
        </Card>

        <Card style={styles.menuCard}>
          <MenuRow 
            icon={Building2} 
            title="Gerenciar Clínicas e Workspaces" 
            subtitle="Configurações, criação de equipes e códigos"
            onPress={() => router.push('/organization' as never)} 
          />
          <MenuRow 
            icon={SlidersHorizontal} 
            title="Membros e Permissões Granulares" 
            subtitle="Administrador, profissional e assistente"
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
            subtitle={presentation ? 'Ativado (dados confidenciais ocultos)' : 'Ocultar identificadores de pacientes'} 
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
            subtitle="Testar tela de bloqueio e autenticação local"
            onPress={() => setLockModalVisible(true)} 
          />
          <MenuRow 
            icon={Lock} 
            title="Sessões Ativas e Dispositivos" 
            subtitle="Ver aparelhos conectados e encerrar sessões"
            onPress={() => router.push('/security/sessions' as never)} 
          />
          <MenuRow 
            icon={History} 
            title="Trilha de Auditoria (Admin)" 
            subtitle="Registros de acessos a prontuários e assinaturas"
            onPress={() => router.push('/security/audit' as never)} 
          />
        </Card>

        {/* Seção Ferramentas Clínicas e Estoque (§6, §14, §17, §24) */}
        <SectionTitle title="GESTÃO E PROTOCOLOS" />
        <Card style={styles.menuCard}>
          <MenuRow 
            icon={BarChart3} 
            title="Indicadores Clínicos" 
            subtitle="Métricas de cicatrização e etiologias"
            onPress={() => router.push('/indicators' as never)} 
          />
          <MenuRow 
            icon={Package} 
            title="Controle de Estoque & Lotes" 
            subtitle="Rastreabilidade de coberturas e alertas de vencimento"
            onPress={() => router.push('/inventory' as never)} 
          />
          <MenuRow 
            icon={Sparkles} 
            title="Templates Clínicos" 
            subtitle="Protocolos de curativos, laser e orientações"
            onPress={() => router.push('/templates' as never)} 
          />
          <MenuRow 
            icon={RefreshCw} 
            title="Central de Sincronização" 
            subtitle={isOnline ? (pending > 0 ? `Online · ${pending} alteração(ões) pendente(s)` : 'Online · Nuvem sincronizada') : 'Offline · Armazenado no SQLite local'}
            onPress={() => router.push('/sync' as never)} 
          />
        </Card>

        <Txt muted style={{ fontSize: 12, textAlign: 'center', marginTop: 8 }}>
          Cicure · Plataforma Profissional de Acompanhamento de Feridas · v2.0
        </Txt>
      </ScrollView>

      {/* Modal de Bloqueio Biomédico / PIN */}
      <AppLockModal 
        visible={lockModalVisible}
        onUnlocked={() => setLockModalVisible(false)}
      />

      {/* Modal de Onboarding (§31) */}
      <OnboardingModal 
        visible={onboardingVisible}
        onFinish={() => setOnboardingVisible(false)}
      />

      {/* Modal de Seleção de Workspace */}
      <WorkspaceSelectorModal 
        visible={workspaceModalVisible}
        onClose={() => setWorkspaceModalVisible(false)}
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
