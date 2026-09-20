import Storage from 'expo-sqlite/kv-store';

// Device preferences are independent of the clinical workspace.
export const readPreference = (key: string) => Storage.getItemSync(key);
export const writePreference = (key: string, value: string) => Storage.setItemSync(key, value);
