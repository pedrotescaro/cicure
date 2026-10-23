import type { Visit } from '../domain/types';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';
import { createAccountClient } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
export async function preserveClinicalPhoto(scope: string, uri: string, id: string): Promise<string> {
  if (!/^user:[a-zA-Z0-9-]+(?::org:[a-zA-Z0-9-]+)?$/.test(scope)) throw new Error('Entre na sua conta para guardar a fotografia.');
  if (Platform.OS === 'web') throw new Error('Use o aplicativo Android para guardar fotografias clínicas.');
  if (!FileSystem.documentDirectory) throw new Error('Armazenamento do aparelho indisponível.');
  const directory = `${FileSystem.documentDirectory}clinical/${scope.replace(/:/g, '-')}/photos/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const target = `${directory}${id.replace(/[^a-zA-Z0-9-]/g, '')}.${/\.png(?:\?|$)/i.test(uri) ? 'png' : 'jpg'}`;
  if (target !== uri) await FileSystem.copyAsync({ from: uri, to: target });
  const info = await FileSystem.getInfoAsync(target);
  if (!info.exists || info.size === 0) throw new Error('A fotografia não foi guardada. Tente escolher a imagem novamente.');
  return target;
}
export async function uploadVisitMedia(scope: string, visit: Visit, requestClient?: SupabaseClient) {
  if (!visit.photos.length) return visit;
  const client = requestClient ?? await createAccountClient(scope);
  const ownerId = scope.startsWith('user:') ? scope.split(':')[1] : '';
  if (!ownerId) throw new Error('Entre na sua conta antes de enviar imagens.');
  const photos = [];
  for (const photo of visit.photos) {
    if (photo.storagePath) {
      photos.push(photo); continue;
    }
    if (!photo.uri.startsWith('file://')) throw new Error('Fotografia sem arquivo durável. Abra o atendimento e anexe a imagem novamente.');
    const base64 = await FileSystem.readAsStringAsync(photo.uri, { encoding: 'base64' });
    const isPng = /\.png(?:\?|$)/i.test(photo.uri);
    const path = `${ownerId}/${visit.patientId}/${visit.woundId}/${visit.id}/${photo.id}.${isPng ? 'png' : 'jpg'}`;
    const { error } = await client.storage.from('clinical-files').upload(path, decode(base64), { contentType: isPng ? 'image/png' : 'image/jpeg', upsert: true });
    if (error) throw error;
    photos.push({ ...photo, storagePath: path });
  }
  return { ...visit, photos };
}

export async function hydrateVisitMedia(scope: string, visit: Visit, requestClient?: SupabaseClient): Promise<{ visit: Visit; failed: number }> {
  if (!visit.photos.length) return { visit, failed: 0 };
  const client = requestClient ?? await createAccountClient(scope);
  let failed = 0;
  const photos = await Promise.all(visit.photos.map(async photo => {
    const ownDirectory = FileSystem.documentDirectory && `${FileSystem.documentDirectory}clinical/${scope.replace(/:/g, '-')}/photos/`;
    const localFileName = ownDirectory && photo.uri.startsWith(ownDirectory) ? photo.uri.slice(ownDirectory.length) : '';
    const ownLocalFile = Platform.OS !== 'web' && /^[a-zA-Z0-9-]+\.(jpg|png)$/.test(localFileName || '');
    if (!photo.storagePath) {
      if (ownLocalFile) return photo;
      failed += 1;
      return { ...photo, uri: '' };
    }
    try {
      if (ownLocalFile) {
        const existing = await FileSystem.getInfoAsync(photo.uri);
        if (existing.exists) return photo;
      }
      const { data, error } = await client.storage.from('clinical-files').createSignedUrl(photo.storagePath, 600);
      if (error || !data?.signedUrl) throw error ?? new Error('Imagem indisponível');
      if (Platform.OS === 'web') return { ...photo, uri: data.signedUrl };
      const directory = FileSystem.documentDirectory && `${FileSystem.documentDirectory}clinical/${scope.replace(/:/g, '-')}/photos/`;
      if (!directory) throw new Error('Armazenamento de imagens indisponível');
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      const extension = photo.storagePath.endsWith('.png') ? 'png' : 'jpg';
      const target = `${directory}cicure-${photo.id.replace(/[^a-zA-Z0-9-]/g, '')}.${extension}`;
      await FileSystem.downloadAsync(data.signedUrl, target);
      return { ...photo, uri: target };
    } catch {
      failed += 1;
      return ownLocalFile ? photo : { ...photo, uri: '' };
    }
  }));
  return { visit: { ...visit, photos }, failed };
}
