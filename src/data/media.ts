import type { Visit } from '../domain/types';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';
import { supabase } from './supabase';
export async function uploadVisitMedia(scope: string, visit: Visit) {
  if (!supabase || !visit.photos.length) return visit;
  const ownerId = scope.startsWith('user:') ? scope.slice(5) : '';
  if (!ownerId) throw new Error('Entre na sua conta antes de enviar imagens.');
  const photos = [];
  for (const photo of visit.photos) {
    if (photo.storagePath || !photo.uri.startsWith('file://')) { photos.push(photo); continue; }
    const base64 = await FileSystem.readAsStringAsync(photo.uri, { encoding: 'base64' });
    const isPng = /\.png(?:\?|$)/i.test(photo.uri);
    const path = `${ownerId}/${visit.patientId}/${visit.woundId}/${visit.id}/${photo.id}.${isPng ? 'png' : 'jpg'}`;
    const { error } = await supabase.storage.from('clinical-files').upload(path, decode(base64), { contentType: isPng ? 'image/png' : 'image/jpeg', upsert: true });
    if (error) throw error;
    photos.push({ ...photo, storagePath: path });
  }
  return { ...visit, photos };
}

export async function hydrateVisitMedia(visit: Visit): Promise<{ visit: Visit; failed: number }> {
  const client = supabase;
  if (!client || !visit.photos.length) return { visit, failed: 0 };
  let failed = 0;
  const photos = await Promise.all(visit.photos.map(async photo => {
    if (!photo.storagePath) return photo;
    try {
      if (Platform.OS !== 'web' && photo.uri.startsWith('file://')) {
        const existing = await FileSystem.getInfoAsync(photo.uri);
        if (existing.exists) return photo;
      }
      const { data, error } = await client.storage.from('clinical-files').createSignedUrl(photo.storagePath, 600);
      if (error || !data?.signedUrl) throw error ?? new Error('Imagem indisponível');
      if (Platform.OS === 'web') return { ...photo, uri: data.signedUrl };
      const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!directory) throw new Error('Cache de imagens indisponível');
      const extension = photo.storagePath.endsWith('.png') ? 'png' : 'jpg';
      const target = `${directory}cicure-${photo.id}.${extension}`;
      await FileSystem.downloadAsync(data.signedUrl, target);
      return { ...photo, uri: target };
    } catch {
      failed += 1;
      return photo;
    }
  }));
  return { visit: { ...visit, photos }, failed };
}
