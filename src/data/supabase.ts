import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const cloudConfigured = Boolean(url && key);
const storage = { getItem: async (key: string) => Platform.OS === 'web' ? null : SecureStore.getItemAsync(key), setItem: async (key: string, value: string) => { if (Platform.OS !== 'web') await SecureStore.setItemAsync(key, value); }, removeItem: async (key: string) => { if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(key); } };
export const supabase = cloudConfigured ? createClient(url!, key!, { auth: { storage, persistSession: Platform.OS !== 'web', autoRefreshToken: true, detectSessionInUrl: false } }) : null;
