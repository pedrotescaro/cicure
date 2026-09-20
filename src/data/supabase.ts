import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://uuvypyzboqutecdmzqod.supabase.co';
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1dnlweXpib3F1dGVjZG16cW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjIzOTEsImV4cCI6MjA5ODQ5ODM5MX0.lJY6K0lNQ58XYYZjPCUSfsjxNtCCHbKOPRP1wUA_FIg';
export const cloudConfigured = Boolean(url && key);
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
export const supabase = createClient(url, key, { 
  auth: { 
    storage, 
    persistSession: true, 
    autoRefreshToken: true, 
    detectSessionInUrl: false 
  } 
});
