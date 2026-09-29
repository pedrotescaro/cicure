import { useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, FileText, Image as ImageIcon, Plus } from 'lucide-react-native';
import { supabase } from '../../../data/supabase';
import { uid, useStore } from '../../../data/store';
import { Txt } from '../../../ui/components';
import { fonts, useTheme } from '../../../ui/theme';
import type { PatientDocument } from '../domain/types';

const MAX_BYTES = 10 * 1024 * 1024;
const fileTypes = ['application/pdf', 'image/jpeg', 'image/png'] as const;

export default function PrivateDocumentCenterScreen({ patientId }: { patientId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: c } = useTheme();
  const patient = useStore(s => s.data.patients.find(p => p.id === patientId));
  const documents = useStore(s => s.data.documents).filter(d => d.patientId === patientId);
  const ownerId = useStore(s => s.authUserId);
  const save = useStore(s => s.save);
  const [filter, setFilter] = useState<'Todos' | 'PDF' | 'Imagens'>('Todos');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const upload = async () => {
    if (!supabase || !ownerId) { setError('Entre na sua conta para anexar documentos.'); return; }
    setError(''); setNotice('');
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: [...fileTypes], copyToCacheDirectory: true });
      if (result.canceled || !result.assets[0]) return;
      const file = result.assets[0];
      const mime = file.mimeType;
      if (!mime || !fileTypes.some(type => type === mime)) throw new Error('Selecione um PDF, JPG ou PNG.');
      if (file.size && file.size > MAX_BYTES) throw new Error('O arquivo deve ter até 10 MB.');
      setBusy(true);
      const id = uid();
      const extension = mime === 'application/pdf' ? 'pdf' : mime === 'image/png' ? 'png' : 'jpg';
      const path = `${ownerId}/${patientId}/documents/${id}.${extension}`;
      let bytes: ArrayBuffer;
      if (Platform.OS === 'web') {
        bytes = file.file ? await file.file.arrayBuffer() : await (await fetch(file.uri)).arrayBuffer();
      } else {
        bytes = decode(await FileSystem.readAsStringAsync(file.uri, { encoding: 'base64' }));
      }
      if (bytes.byteLength > MAX_BYTES) throw new Error('O arquivo deve ter até 10 MB.');
      const { error: uploadError } = await supabase.storage.from('clinical-files').upload(path, bytes, { contentType: mime, upsert: false });
      if (uploadError) throw uploadError;
      const document: PatientDocument = {
        id, patientId,
        title: file.name.replace(/\.[^/.]+$/, ''),
        type: mime === 'application/pdf' ? 'pdf' : 'imagem',
        fileName: file.name,
        fileSize: `${Math.max(1, Math.round(bytes.byteLength / 1024))} KB`,
        storagePath: path,
        createdAt: new Date().toISOString(),
        createdBy: ownerId,
      };
      try { await save('documents', document); }
      catch (cause) {
        await supabase.storage.from('clinical-files').remove([path]);
        throw cause;
      }
      setNotice('Documento anexado em armazenamento privado. O registro entrou na fila de sincronização.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível anexar o documento.');
    } finally {
      setBusy(false);
    }
  };

  const openDocument = async (document: PatientDocument) => {
    if (!supabase) { setError('Conexão indisponível.'); return; }
    setError('');
    try {
      const { data, error: linkError } = await supabase.storage.from('clinical-files').createSignedUrl(document.storagePath, 600);
      if (linkError || !data?.signedUrl) throw linkError ?? new Error('Arquivo indisponível');
      await Linking.openURL(data.signedUrl);
    } catch { setError('Não foi possível abrir o arquivo. Verifique a conexão e tente novamente.'); }
  };

  const visible = documents
    .filter(d => filter === 'Todos' || (filter === 'PDF' ? d.type === 'pdf' : d.type === 'imagem'))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return <View style={{ flex: 1, backgroundColor: c.bg }}>
    <ScrollView contentContainerStyle={{ paddingTop: Math.max(insets.top, 16), paddingBottom: insets.bottom + 32, paddingHorizontal: 20 }}>
      <View style={{ maxWidth: 700, width: '100%', alignSelf: 'center', gap: 20 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><ArrowLeft size={24} color={c.text} /></Pressable>
        <View style={{ gap: 8 }}>
          <Txt accessibilityRole="header" style={{ fontFamily: fonts.semibold, fontSize: 27 }}>Documentos</Txt>
          <Txt muted style={{ fontSize: 16, lineHeight: 23 }}>{patient?.name || 'Paciente'} · arquivos privados do prontuário</Txt>
        </View>
        <Txt muted style={{ fontSize: 15, lineHeight: 22 }}>PDF, JPG ou PNG de até 10 MB. É necessária uma conexão para anexar e abrir arquivos.</Txt>
        <Pressable accessibilityRole="button" accessibilityLabel="Anexar documento" disabled={busy || !patient} onPress={() => void upload()} style={{ minHeight: 54, borderRadius: 14, backgroundColor: c.red, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, opacity: busy ? 0.5 : 1 }}>
          {busy ? <ActivityIndicator color="#fff" /> : <><Plus size={20} color="#fff" /><Txt style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 17 }}>Anexar documento</Txt></>}
        </Pressable>
        {!!error && <Txt accessibilityRole="alert" style={{ color: c.red, fontSize: 16 }}>{error}</Txt>}
        {!!notice && <Txt accessibilityRole="alert" style={{ color: c.green, fontSize: 16 }}>{notice}</Txt>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['Todos', 'PDF', 'Imagens'] as const).map(option => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: filter === option }} onPress={() => setFilter(option)} style={{ minHeight: 48, paddingHorizontal: 16, borderWidth: 1, borderColor: filter === option ? c.red : c.border, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: filter === option ? c.redSoft : c.surface }}><Txt style={{ fontFamily: fonts.semibold, fontSize: 15 }}>{option}</Txt></Pressable>)}
        </View>
        {visible.length === 0 ? <Txt muted style={{ fontSize: 16, lineHeight: 23, paddingVertical: 20 }}>Nenhum documento nesta lista.</Txt> : visible.map(document => <View key={document.id} style={{ borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, backgroundColor: c.surface, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>{document.type === 'imagem' ? <ImageIcon size={24} color={c.red} /> : <FileText size={24} color={c.red} />}<Txt style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 17 }} numberOfLines={2}>{document.title}</Txt></View>
          <Txt muted style={{ fontSize: 14 }}>{document.fileName} · {document.fileSize || 'Tamanho não informado'}</Txt>
          <Pressable accessibilityRole="button" accessibilityLabel={`Abrir ${document.fileName}`} onPress={() => void openDocument(document)} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border, borderRadius: 12 }}><Txt style={{ color: c.red, fontFamily: fonts.semibold, fontSize: 16 }}>Abrir arquivo</Txt></Pressable>
        </View>)}
      </View>
    </ScrollView>
  </View>;
}
