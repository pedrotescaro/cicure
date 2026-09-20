export const readPreference = (key: string) => localStorage.getItem(key);
export const writePreference = (key: string, value: string) => localStorage.setItem(key, value);
