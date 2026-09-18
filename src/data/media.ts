import type { Visit } from '../domain/types';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';
export async function uploadVisitMedia(scope: string, visit: Visit) {
  if (!supabase || !visit.photos.length) return visit;
  const photos = [];
  for (const photo of visit.photos) {
    if (photo.storagePath || !photo.uri.startsWith('file://')) { photos.push(photo); continue; }
    const base64 = await FileSystem.readAsStringAsync(photo.uri, { encoding: 'base64' });
    const path = `${scope}/${visit.patientId}/${visit.woundId}/${visit.id}/${photo.id}.jpg`;
    const { error } = await supabase.storage.from('clinical-photos').upload(path, decodeBase64(base64), { contentType: 'image/jpeg', upsert: true });
    if (!error) photos.push({ ...photo, storagePath: path }); else photos.push(photo);
  }
  return { ...visit, photos };
}
function decodeBase64(value: string) { const bytes = Uint8Array.from(atob(value), c => c.charCodeAt(0)); return bytes; }
