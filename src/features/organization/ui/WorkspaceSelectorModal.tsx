import React, { useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { X } from 'lucide-react-native';
import { Button, Choices, Field, IconButton, Txt, s } from '../../../ui/components';
import { useTheme } from '../../../ui/theme';
import { useStore } from '../../../data/store';

export function WorkspaceSelectorModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme(); const store = useStore();
  const [tab, setTab] = useState('Meus espaços'); const [name, setName] = useState(''); const [cnpj, setCnpj] = useState(''); const [phone, setPhone] = useState(''); const [token, setToken] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const act = async (operation: () => Promise<unknown>) => { setError(''); setBusy(true); try { await operation(); onClose(); } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível concluir. Tente novamente.'); } finally { setBusy(false); } };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}><View style={{ backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%', gap: 16 }}>
    <View style={s.between}><Txt style={s.h2}>Clínica ou equipe</Txt><IconButton icon={X} label="Fechar" onPress={onClose} /></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>
      <Choices options={['Meus espaços', 'Criar clínica', 'Aceitar convite']} value={tab} onChange={value => { setTab(value); setError(''); }} />
      {tab === 'Meus espaços' && <><Button title="Abrir meu espaço individual" variant="outline" loading={busy} onPress={() => void act(() => store.setWorkMode('individual'))} />{store.organizations.filter(item => !item.isIndividual).map(item => <Button key={item.id} title={'Abrir ' + item.name} variant="outline" loading={busy} onPress={() => void act(() => store.setWorkMode('group', item.id))} />)}<Txt muted>O acesso às clínicas precisa ser confirmado com internet. Os prontuários individuais não são transferidos para a equipe.</Txt></>}
      {tab === 'Criar clínica' && <><Txt>Você será o primeiro administrador. A clínica começará sem pacientes e sem registros; convide cada integrante pelo e-mail.</Txt><Field label="Nome da clínica ou equipe" value={name} onChangeText={setName} /><Field label="CNPJ (opcional)" keyboardType="number-pad" value={cnpj} onChangeText={setCnpj} /><Field label="Telefone (opcional)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} /><Button title="Criar e abrir clínica" loading={busy} onPress={() => void act(() => store.createGroup(name, cnpj, phone))} /></>}
      {tab === 'Aceitar convite' && <><Txt>Cole o convite completo. Ele vale por sete dias e só pode ser aceito pela conta com o e-mail escolhido pelo administrador.</Txt><Field label="Código completo do convite" autoCapitalize="none" autoCorrect={false} value={token} onChangeText={setToken} /><Button title="Validar e aceitar convite" loading={busy} onPress={() => void act(async () => { const result = await store.joinGroup(token); if (!result.success) throw new Error(result.message); })} /></>}
      {Boolean(error) && <Txt accessibilityRole="alert">{error}</Txt>}
    </ScrollView>
  </View></View></Modal>;
}
