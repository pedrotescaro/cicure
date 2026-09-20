import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Network from 'expo-network';
import { useStore } from './store';

export type NetworkState = {
  isOnline: boolean;
  isConnected: boolean;
};

let listeners: ((state: NetworkState) => void)[] = [];
let currentState: NetworkState = { isOnline: true, isConnected: true };
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export async function checkNetworkStatus(): Promise<NetworkState> {
  if (Platform.OS === 'web') {
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    currentState = { isOnline: online, isConnected: online };
    return currentState;
  }

  try {
    const networkState = await Network.getNetworkStateAsync();
    const online = Boolean(networkState.isConnected && networkState.isInternetReachable !== false);
    currentState = {
      isOnline: online,
      isConnected: Boolean(networkState.isConnected)
    };
    return currentState;
  } catch {
    return currentState;
  }
}

export function notifyNetworkChange(state: NetworkState) {
  currentState = state;
  listeners.forEach(l => l(state));

  // Quando detectar retorno de internet, dispara sincronizacao automatica da fila local
  if (state.isOnline) {
    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(() => {
      void useStore.getState().sync();
    }, 1500);
  }
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkState>(currentState);
  const syncState = useStore(st => st.syncState);
  const pending = useStore(st => st.pending);

  useEffect(() => {
    let mounted = true;

    const update = (s: NetworkState) => {
      if (mounted) setStatus(s);
    };

    listeners.push(update);

    // Checagem inicial
    void checkNetworkStatus().then(s => {
      if (mounted) setStatus(s);
    });

    // Listener para Web
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = () => notifyNetworkChange({ isOnline: true, isConnected: true });
      const handleOffline = () => notifyNetworkChange({ isOnline: false, isConnected: false });

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        mounted = false;
        listeners = listeners.filter(l => l !== update);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    // Polling periodico leve para Mobile
    const interval = setInterval(async () => {
      const next = await checkNetworkStatus();
      if (next.isOnline !== currentState.isOnline) {
        notifyNetworkChange(next);
      }
    }, 8000);

    return () => {
      mounted = false;
      listeners = listeners.filter(l => l !== update);
      clearInterval(interval);
    };
  }, []);

  return {
    ...status,
    syncState,
    pending,
    syncNow: () => useStore.getState().sync()
  };
}
