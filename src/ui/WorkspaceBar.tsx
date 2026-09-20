import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
import { WorkspaceSelectorModal } from '../features/organization/ui/WorkspaceSelectorModal';

export function WorkspaceBar() {
  const router = useRouter();
  const store = useStore();
  const { colors: c, isDark } = useTheme();
  const { workMode, activeOrg } = store;
  const { isOnline, pending, syncState } = useNetworkStatus();
  const [modalVisible, setModalVisible] = useState(false);

  const isIndividual = workMode === 'individual';
  const orgName = isIndividual ? 'Individual (Autônomo)' : activeOrg.name;

  return (
    <>
      <View style={styles.container}>
        {/* Workspace Switcher Chip */}
        <Pressable 
          onPress={() => setModalVisible(true)} 
          style={({ pressed }) => [
            styles.chip, 
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
          <Txt style={styles.chipText} numberOfLines={1}>
            {orgName}
          </Txt>
          <ChevronDown size={14} color={c.secondary} />
        </Pressable>

        {/* Connectivity Status Pill */}
        <Pressable 
          onPress={() => router.push('/sync' as never)}
          style={({ pressed }) => [
            styles.statusPill, 
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
          <Txt style={styles.statusText}>
            {isOnline 
              ? (pending > 0 ? `${pending} pendente(s)` : 'Online') 
              : 'Offline (SQLite)'}
          </Txt>
          {isOnline && syncState === 'syncing' ? (
            <RefreshCw size={11} color={c.green} />
          ) : null}
        </Pressable>
      </View>

      <WorkspaceSelectorModal 
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 4,
    marginBottom: 10,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: '65%',
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    flexShrink: 1,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: fonts.medium,
    fontSize: 11,
  }
});
