import React from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Building2,
  ChevronDown,
  RefreshCw,
  User
} from 'lucide-react-native';
import { Txt } from './components';
import { fonts, useTheme } from './theme';
import { useStore } from '../data/store';
import { useNetworkStatus } from '../data/network';

export function WorkspaceBar() {
  const router = useRouter();
  const store = useStore();
  const { colors: c, isDark } = useTheme();
  const { workMode, activeOrg } = store;
  const { isOnline, pending, syncState } = useNetworkStatus();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 560 * Math.max(1, fontScale);
  const controlHeight = Math.max(48, Math.ceil(fontScale * 44));

  const isIndividual = workMode === 'individual';
  const orgName = isIndividual ? 'Atendimento individual' : activeOrg.name;

  return (
    <>
      <View style={[styles.container, compact && { flexDirection: 'column', alignItems: 'stretch' }]}>
        {/* Workspace Switcher Chip */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Clínica ou equipe: ${orgName}`}
          onPress={() => router.push('/organization' as never)}
          style={({ pressed }) => [
            styles.chip,
            { minHeight: controlHeight },
            compact && { flexGrow: 0, width: '100%' },
            { backgroundColor: isDark ? '#232328' : '#F5F5F5', borderColor: c.border },
            pressed && { opacity: 0.8 }
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: isIndividual ? (isDark ? '#33333A' : c.dark) : c.red }]}>
            {isIndividual ? (
              <User size={13} color="#FFF" />
            ) : (
              <Building2 size={13} color="#FFF" />
            )}
          </View>
          <Txt style={styles.chipText} numberOfLines={compact && fontScale > 1.2 ? 2 : 1}>
            {orgName}
          </Txt>
          <ChevronDown size={14} color={c.secondary} />
        </Pressable>

        {/* Connectivity Status Pill */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Consultar envio de dados"
          onPress={() => router.push('/sync' as never)}
          style={({ pressed }) => [
            styles.statusPill,
            { minHeight: controlHeight },
            compact && { width: '100%' },
            {
              backgroundColor: isOnline
                ? (isDark ? '#142A1D' : '#EEF9F1')
                : (isDark ? '#232328' : '#F7F7F7'),
              borderColor: isOnline
                ? (isDark ? '#1B472E' : '#D4EED8')
                : c.border,
            },
            pressed && { opacity: 0.8 }
          ]}
        >
          <View style={[styles.dot, { backgroundColor: isOnline ? c.green : '#9E9E9E' }]} />
          <Txt style={styles.statusText} numberOfLines={2}>
            {isOnline
              ? (syncState === 'syncing' ? 'Enviando dados' : pending > 0 ? `${pending} envios pendentes` : syncState === 'synced' ? 'Dados enviados' : 'Salvo neste aparelho')
              : 'Sem internet'}
          </Txt>
          <View style={styles.statusIcon}>{isOnline && syncState === 'syncing' ? <RefreshCw size={13} color={c.green} /> : null}</View>
        </Pressable>
      </View>

    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    marginBottom: 10,
  },
  chip: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 48,
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    flex: 1,
    minWidth: 0,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 48,
  },
  dot: {
    flexShrink: 0,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    flexShrink: 1,
    minWidth: 0,
  },
  statusIcon: { width: 14, height: 16, marginLeft: 'auto', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
