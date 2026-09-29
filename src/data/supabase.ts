import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)?.trim();

function validCloudUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname));
  } catch {
    return false;
  }
}

export const cloudConfigured = validCloudUrl(url) && Boolean(key && !key.startsWith('your-'));
const storage = { 
  getItem: async (k: string) => Platform.OS === 'web' ? (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null) : SecureStore.getItemAsync(k), 
  setItem: async (k: string, value: string) => { 
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(k, value);
    } else {
      await SecureStore.setItemAsync(k, value);
    }
  }, 
  removeItem: async (k: string) => { 
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(k);
    } else {
      await SecureStore.deleteItemAsync(k);
    }
  } 
};
export const supabase = cloudConfigured && url && key ? createClient(url, key, {
  auth: { 
    storage, 
    persistSession: true, 
    autoRefreshToken: true, 
    detectSessionInUrl: false,
    flowType: 'pkce'
  } 
}) : null;
