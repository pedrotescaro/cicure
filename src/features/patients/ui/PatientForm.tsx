import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Choices, Field, IconButton, Txt, s } from '../../../ui/components';
import { DateField } from '../../../ui/DateField';
import { useTheme } from '../../../ui/theme';
import { useMotionPreferences } from '../../../ui/useMotionPreferences';
import { uid, useStore } from '../../../data/store';
import type { Patient } from '../../../domain/types';
import { buildPatient, patientFormErrors, patientFormValues, type PatientFormValues } from '../domain/patient-form';

export function PatientForm({ patient, onClose, onSaved }: { patient?: Patient; onClose: () => void; onSaved: (patient: Patient) => void }) {
  const { colors: c } = useTheme();
  const { reduceMotion } = useMotionPreferences();
  const insets = useSafeAreaInsets();
  const save = useStore(state => state.save);
  const patients = useStore(state => state.data.patients);
  const [values, setValues] = useState(() => patientFormValues(patient));
  const [errors, setErrors] = useState<ReturnType<typeof patientFormErrors>>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const update = (key: keyof PatientFormValues, value: string) => { setValues(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: undefined })); setFailure(''); };
  const dirty = JSON.stringify(values) !== JSON.stringify(patientFormValues(patient));
  const close = () => {
    if (saving) return;
    if (!dirty) { onClose(); return; }
    Alert.alert('Descartar alterações?', 'Os dados que você preencheu ainda não foram salvos.', [{ text: 'Continuar preenchendo', style: 'cancel' }, { text: 'Descartar', style: 'destructive', onPress: onClose }]);
  };
  const submit = async () => {
    const nextErrors = patientFormErrors(values);
    if (values.cpf.trim() && patients.some(item => item.id !== patient?.id && item.cpf.replace(/\D/g, '') === values.cpf.replace(/\D/g, ''))) nextErrors.cpf = 'Este CPF já está cadastrado. Busque o paciente na lista.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setFailure('Revise os campos indicados antes de salvar.'); return; }
    setSaving(true);
    try { const next = buildPatient(values, patient?.id ?? uid(), patient); await save('patients', next); onSaved(next); }
    catch { setFailure('Não foi possível salvar. Seus dados continuam aqui; tente novamente.'); }
    finally { setSaving(false); }
  };
  return <Modal visible animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={close}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={[s.between, { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }]}>
        <Txt accessibilityRole="header" style={s.h2}>{patient ? 'Editar paciente' : 'Novo paciente'}</Txt>
        <IconButton icon={X} label="Fechar cadastro" onPress={close} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 20, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
        <Txt muted>O nome é obrigatório. Os outros dados podem ser preenchidos depois, sem criar informações presumidas.</Txt>
        <Field label="Nome completo (obrigatório)" value={values.name} error={errors.name} onChangeText={value => update('name', value)} autoCapitalize="words" placeholder="Ex.: Maria de Lourdes" />
        <DateField label="Data de nascimento" value={values.birthDate} onChange={value => update('birthDate', value)} />
        {errors.birthDate && <Txt accessibilityLiveRegion="polite" style={{ color: c.red }}>{errors.birthDate}</Txt>}
        <Txt style={s.h2}>Dados do paciente</Txt>
        <Txt>Sexo registrado</Txt>
        <Choices options={['Não informado', 'Feminino', 'Masculino', 'Outro']} value={values.sex} onChange={value => update('sex', value)} />
        <Field label="CPF" value={values.cpf} error={errors.cpf} keyboardType="number-pad" onChangeText={value => update('cpf', value)} placeholder="11 dígitos" />
        <Field label="Cartão SUS" value={values.sus} error={errors.sus} keyboardType="number-pad" onChangeText={value => update('sus', value)} placeholder="15 dígitos" />
        <Field label="Telefone com DDD" value={values.phone} error={errors.phone} keyboardType="phone-pad" onChangeText={value => update('phone', value)} placeholder="Ex.: (11) 99999-9999" />
        <Field label="Endereço" value={values.address} onChangeText={value => update('address', value)} placeholder="Rua, número, bairro e cidade" />
        <Field label="Contato de emergência" value={values.emergency} onChangeText={value => update('emergency', value)} placeholder="Nome e telefone" />
        <Txt style={s.h2}>Informações de saúde</Txt>
        <Field label="Alergias conhecidas" value={values.allergies} onChangeText={value => update('allergies', value)} placeholder="Separe por vírgula; deixe vazio se não informado" multiline />
        <Field label="Doenças e condições de saúde" value={values.comorbidities} onChangeText={value => update('comorbidities', value)} placeholder="Ex.: diabetes, hipertensão. Separe por vírgula." multiline />
        {patient && <><Txt>Situação do acompanhamento</Txt><Choices options={['Ativo', 'Alta', 'Arquivado']} value={values.status} onChange={value => update('status', value)} /></>}
        {!!failure && <Txt accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: c.red }}>{failure}</Txt>}
        <Button title={patient ? 'Salvar alterações' : 'Cadastrar paciente'} loading={saving} onPress={() => void submit()} />
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>;
}
