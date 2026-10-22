import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Check, FileCheck } from 'lucide-react-native';
import { Badge, Button, Card, Field, Txt } from '../../../ui/components';
import { fonts, useTheme } from '../../../ui/theme';
import type { Patient, Wound, Visit } from '../../../domain/types';
import type { SOAPNote } from '../domain/types';
import { generateSOAPDraft } from '../domain/soap.service';

export default function SOAPEditor({ visit, patient, wound, authorName, onChange, onSave }: {
  visit: Visit; patient: Patient; wound: Wound; authorName?: string;
  onChange: (soap: SOAPNote) => void;
  onSave: (soap: SOAPNote) => Promise<void>;
}) {
  const { colors } = useTheme();
  const suggested = useMemo(() => generateSOAPDraft(visit, patient, wound), [visit, patient, wound]);
  const soap = visit.soap ?? suggested;
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [replace, setReplace] = useState(false);
  const edit = (key: 'subjective' | 'objective' | 'assessment' | 'plan', text: string) => {
    setMessage('');
    onChange({ ...soap, [key]: text, status: 'Revisado', confirmedAt: undefined, confirmedBy: undefined, updatedAt: new Date().toISOString() });
  };
  const generate = () => { onChange(suggested); setReplace(false); setMessage('Rascunho preenchido com os dados deste atendimento. Revise o texto antes de confirmar.'); };
  const confirm = async () => {
    if (![soap.subjective, soap.objective, soap.assessment, soap.plan].every(text => text.trim())) {
      setMessage('Preencha as quatro partes da evolução antes de confirmar.'); return;
    }
    if (!authorName?.trim()) { setMessage('Complete seu perfil profissional antes de confirmar a evolução.'); return; }
    const now = new Date().toISOString();
    const confirmed: SOAPNote = { ...soap, status: 'Confirmado', confirmedAt: now, confirmedBy: authorName, updatedAt: now };
    setSaving(true); setMessage('');
    try {
      await onSave(confirmed);
      setMessage('Evolução confirmada e salva neste aparelho. O envio pode continuar pendente.');
    } catch {
      setMessage('Não foi possível salvar a evolução. O texto continua nesta tela; tente confirmar novamente.');
    } finally { setSaving(false); }
  };
  return <Card style={{ gap: 16 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <FileCheck size={22} color={colors.red} />
      <Txt style={{ fontFamily: fonts.semibold, fontSize: 18, flex: 1 }}>Evolução clínica</Txt>
      <Badge tone={visit.soap?.status === 'Confirmado' ? 'green' : 'amber'}>{visit.soap?.status ?? 'Rascunho sugerido'}</Badge>
    </View>
    <Txt muted style={{ fontSize: 16, lineHeight: 23 }}>Registro opcional em quatro partes, conhecido como SOAP. O texto sugerido apenas organiza as informações informadas; revise a avaliação e o plano de cuidado.</Txt>
    <Button title="Preencher com os dados do atendimento" variant="outline" onPress={() => visit.soap ? setReplace(true) : generate()} />
    {replace && <View style={{ gap: 10 }}>
      <Txt>O novo rascunho substituirá o texto editado nesta evolução.</Txt>
      <Button title="Substituir pelo novo rascunho" variant="outline" onPress={generate} />
      <Button title="Manter meu texto" variant="ghost" onPress={() => setReplace(false)} />
    </View>}
    <Field label="Relato do paciente" multiline editable={!saving} value={soap.subjective} onChangeText={text => edit('subjective', text)} placeholder="Queixas, percepções e dor relatadas pelo paciente." />
    <Field label="Exame e medidas" multiline editable={!saving} value={soap.objective} onChangeText={text => edit('objective', text)} placeholder="Achados do exame, medidas, tecidos e secreção." />
    <Field label="Avaliação profissional" multiline editable={!saving} value={soap.assessment} onChangeText={text => edit('assessment', text)} placeholder="Sua avaliação da ferida e da evolução observada." />
    <Field label="Plano de cuidado" multiline editable={!saving} value={soap.plan} onChangeText={text => edit('plan', text)} placeholder="Conduta realizada, orientações e retorno." />
    <Button title="Confirmar e salvar evolução" icon={Check} onPress={() => void confirm()} loading={saving} />
    {Boolean(message) && <Txt accessibilityLiveRegion="polite" style={{ fontSize: 16, lineHeight: 23 }}>{message}</Txt>}
  </Card>;
}
