import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Building2, 
  ChevronDown, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  User 
} from 'lucide-react-native';
import { Txt, s } from './components';
import { colors as c, fonts } from './theme';
import { useStore } from '../data/store';
import { useNetworkStatus } from '../data/network';
import { WorkspaceSelectorModal } from '../features/organization/ui/WorkspaceSelectorModal';

export function WorkspaceBar() {
  const router = useRouter();
  const store = useStore();
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
          style={({ pressed }) => [styles.chip, pressed && { opacity: 0.8 }]}
        >
          <View style={[styles.iconCircle, isIndividual ? styles.individualIcon : styles.groupIcon]}>
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
            !isOnline && styles.offlinePill,
            pressed && { opacity: 0.8 }
          ]}
        >
          <View style={[styles.dot, isOnline ? styles.onlineDot : styles.offlineDot]} />
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
    backgroundColor: '#F5F5F5',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    maxWidth: '65%',
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: c.text,
    flexShrink: 1,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  individualIcon: {
    backgroundColor: c.dark,
  },
  groupIcon: {
    backgroundColor: c.red,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF9F1',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D4EED8',
  },
  offlinePill: {
    backgroundColor: '#F7F7F7',
    borderColor: '#E5E5E5',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  onlineDot: {
    backgroundColor: c.green,
  },
  offlineDot: {
    backgroundColor: '#9E9E9E',
  },
  statusText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: c.text,
  }
});
