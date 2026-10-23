import { CicureWordmark } from './brand/CicureWordmark';
import React, { useState } from 'react';
import { AppState, BackHandler, Image, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { addDays, format } from 'date-fns';
import { Camera, Check, ChevronLeft, ChevronRight, Copy, Plus, Save, X, Trash2 } from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { Avatar, Badge, Button, Card, Choices, Empty, Field, IconButton, Label, Pills, SectionTitle, Txt, safeBack, s } from './components';
import { DateField } from './DateField';
import { ClinicalPhotoCalibration } from './ClinicalPhotoCalibration';
import { ClinicalInventoryUse } from './ClinicalInventoryUse';
import { TemplatePickerModal } from '../features/templates/ui/TemplatePickerModal';
import { fonts, useTheme } from './theme';
import { area, dateLabel, decimal, measurementSchema, number } from '../domain/clinical';
import { useStore, uid } from '../data/store';
import { preserveClinicalPhoto } from '../data/media';
import type { Patient, Photo, Visit, Wound } from '../domain/types';
import { newVisit } from '../domain/visit';
import { concludeVisit, emptyVitals, vitalErrors, visitAuthor } from '../domain/visit.lifecycle';
import { duplicateVisit, duplicateSummary } from '../features/duplicate-visit/domain/duplicate-visit.service';
import type { SOAPNote } from '../features/soap/domain/types';
import SOAPEditor from '../features/soap/ui/SOAPEditor';

const stepOptions = ['Medidas', 'Tecidos e dor', 'Sinais vitais', 'Curativos', 'Terapias', 'Fotos', 'Revisão e conclusão'];
type FormValues = Pick<Visit, 'length' | 'width' | 'depth'>;

export function CareWizard({ visitId, patientId, woundId }: { visitId?: string; patientId?: string; woundId?: string }) {
  const router = useRouter();
  const store = useStore();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;
  const existing = visitId ? store.data.visits.find(v => v.id === visitId) : undefined;
  const [local, setLocal] = useState<Visit>(() => {
    if (existing) return existing;
    const p = patientId ?? '';
    const w = woundId ?? store.data.wounds.find(item => item.patientId === p && !item.deletedAt)?.id ?? '';
    return newVisit(uid(), p, w);
  });
  const localRef = React.useRef(local);
  const [step, setStep] = useState(Math.min(6, Math.max(0, local.step || 0)));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const scrollRef = React.useRef<ScrollView>(null);
  const scopeRef = React.useRef(store.scope);
  const saveChain = React.useRef<Promise<void>>(Promise.resolve());
  const lastSaved = React.useRef(existing ? JSON.stringify(existing) : '');
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const patient = store.data.patients.find(p => p.id === local.patientId && !p.deletedAt);
  const wound = store.data.wounds.find(w => w.id === local.woundId && w.patientId === local.patientId && !w.deletedAt);
  const profile = store.data.profiles.find(p => p.id === store.authUserId) ?? store.data.profiles[0];
  const previousVisit = store.data.visits.filter(v => !v.deletedAt && v.patientId === local.patientId && v.woundId === local.woundId && v.state === 'Concluído' && v.id !== local.id && v.date < local.date).sort((a, b) => b.date.localeCompare(a.date))[0];
  const { control, reset, trigger, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(measurementSchema), defaultValues: { length: local.length, width: local.width, depth: local.depth }, mode: 'onChange'
  });
  const updateDraft = React.useCallback((patch: Partial<Visit>) => {
    const current = localRef.current;
    if (current.state === 'Concluído') return;
    const next = { ...current, ...patch, state: 'Rascunho' as const, authorUserId: current.authorUserId ?? useStore.getState().authUserId ?? undefined, updatedAt: new Date().toISOString() };
    localRef.current = next; setLocal(next); setSaveMessage('Alterações ainda não salvas'); setReviewing(false);
  }, []);
  const persist = React.useCallback((snapshot: Visit = localRef.current) => {
    if (timer.current) clearTimeout(timer.current);
    const operation = saveChain.current.catch(() => undefined).then(async () => {
      if (useStore.getState().scope !== scopeRef.current) throw new Error('A conta mudou. Entre novamente na conta deste atendimento.');
      setSaving(true); setSaveError('');
      try {
        await useStore.getState().save('visits', snapshot);
        lastSaved.current = JSON.stringify(snapshot);
        if (JSON.stringify(localRef.current) === lastSaved.current) setSaveMessage('Salvo neste aparelho');
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar. Tente novamente antes de sair.');
        throw error;
      } finally { setSaving(false); }
    });
    saveChain.current = operation;
    return operation;
  }, []);
  React.useEffect(() => {
    if (!patient || !wound || local.state === 'Concluído' || store.presentation || JSON.stringify(local) === lastSaved.current) return;
    timer.current = setTimeout(() => { void persist(local).catch(() => undefined); }, 500);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [local, patient, wound, persist, store.presentation]);
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active' && localRef.current.state !== 'Concluído' && JSON.stringify(localRef.current) !== lastSaved.current) void persist().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [persist]);
  const leave = React.useCallback(async () => {
    try {
      if (localRef.current.state !== 'Concluído' && localRef.current.patientId && localRef.current.woundId) await persist();
      safeBack(router, '/care');
    } catch { /* Keep the form open with its retry action and text. */ }
  }, [persist, router]);
  useFocusEffect(React.useCallback(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => { void leave(); return true; });
    return () => handler.remove();
  }, [leave]));
  const goToStep = async (nextStep: number) => {
    if (step === 0 && !(await trigger())) return;
    updateDraft({ step: nextStep });
    try { await persist(); setStep(nextStep); scrollRef.current?.scrollTo({ y: 0, animated: false }); } catch {}
  };
  const copyPrevious = async () => {
    if (!previousVisit) return;
    const { visit: duplicated } = duplicateVisit(previousVisit, localRef.current);
    updateDraft(duplicated); reset({ length: duplicated.length, width: duplicated.width, depth: duplicated.depth });
    try {
      await persist();
      setSaveMessage('Dados anteriores copiados e salvos. Revise a conduta e os curativos antes de concluir. ' + duplicateSummary(previousVisit).join(' · '));
    } catch {}
  };
  const saveSOAP = async (soap: SOAPNote) => {
    const base = localRef.current;
    const next = { ...base, soap, updatedAt: new Date().toISOString() };
    await persist(next);
    if (localRef.current === base) { localRef.current = next; setLocal(next); }
    else if (localRef.current.soap === base.soap) updateDraft({ soap });
  };
  const complete = async () => {
    try {
      const author = visitAuthor(useStore.getState().authUserId, profile);
      const next = concludeVisit(localRef.current, author);
      await persist(next);
      localRef.current = next; setLocal(next); setReviewing(false);
      router.replace('/care/' + next.id);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível concluir. Seu rascunho continua disponível.');
      setReviewing(false);
    }
  };
  const addPhoto = async (source: 'camera' | 'library') => {
    if (photoBusy) return;
    setPhotoBusy(true); setSaveError('');
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) throw new Error('A câmera não foi autorizada. Permita o acesso nas configurações do Android ou escolha uma foto da galeria.');
      }
      // The Android system photo picker grants only the selected image; broad gallery access is unnecessary.
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.85, allowsEditing: false };
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri || !asset.width || !asset.height) throw new Error('Não foi possível ler a fotografia. Tente outra imagem.');
      const id = uid();
      const uri = await preserveClinicalPhoto(scopeRef.current, asset.uri, id);
      const photo: Photo = { id, uri, date: new Date().toISOString(), rulerConfirmed: false, contour: [], width: asset.width, height: asset.height, type: 'Leito da ferida' };
      updateDraft({ photos: [...localRef.current.photos, photo] });
      await persist();
    } catch (error) { setSaveError(error instanceof Error ? error.message : 'Não foi possível anexar a fotografia. Tente novamente.'); }
    finally { setPhotoBusy(false); }
  };
  const removePhoto = (photoId: string) => { updateDraft({ photos: localRef.current.photos.filter(photo => photo.id !== photoId) }); };
  if (!patient || !wound || store.presentation) return <View style={[styles.center, { backgroundColor: colors.bg }]}><Empty title={store.presentation ? 'Saia do modo apresentação para atender' : 'Selecione paciente e ferida'} description="Abra o prontuário, selecione a ferida e toque em Novo atendimento." action="Voltar" onPress={() => safeBack(router, '/care')} /></View>;
  if (local.state === 'Concluído') return <View style={[styles.center, { backgroundColor: colors.bg }]}><Empty title="Atendimento concluído" description="O registro original foi preservado. Você pode acrescentar uma correção no resumo." action="Abrir resumo" onPress={() => router.replace('/care/' + local.id)} /></View>;
  return <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingHorizontal: isNarrow ? 16 : 20, paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.topbar}><CicureWordmark size={32} /><IconButton icon={X} label="Salvar e fechar atendimento" onPress={() => void leave()} /></View>
      <View style={{ gap: 8 }}><Txt style={s.h1}>Atendimento</Txt><Txt>{patient.name}</Txt><Txt muted>{wound.location} · {wound.etiology}</Txt></View>
      <View style={{ gap: 10 }}>
        <Txt accessibilityLiveRegion="polite" muted>{saving ? 'Salvando neste aparelho…' : saveMessage || 'Rascunho em andamento'}</Txt>
        {Boolean(saveError) && <View style={{ gap: 10 }}><Txt accessibilityRole="alert" style={{ color: colors.red, lineHeight: 23 }}>{saveError}</Txt><Button title="Tentar salvar novamente" variant="outline" onPress={() => void persist().catch(() => undefined)} /></View>}
        <Button title="Salvar rascunho" icon={Save} variant="outline" loading={saving} onPress={() => void persist().catch(() => undefined)} />
      </View>
      <Card style={{ gap: 12 }}><View style={s.row}><Avatar name={patient.name} color={patient.color} size={42} /><View style={{ flex: 1, gap: 4 }}><Txt style={{ fontFamily: fonts.semibold }}>Ferida em atendimento</Txt><Txt muted>{wound.location}</Txt></View><Badge tone="amber">Rascunho</Badge></View>
      {previousVisit && <Button title="Copiar conduta e curativos anteriores" variant="outline" icon={Copy} onPress={() => void copyPrevious()} />}</Card>
      <Txt style={{ fontFamily: fonts.semibold, fontSize: 16 }}>Etapa {step + 1} de {stepOptions.length}: {stepOptions[step]}</Txt>
      <Pills options={stepOptions} value={stepOptions[step]} onChange={option => void goToStep(stepOptions.indexOf(option))} />
      {step === 0 && <MeasurementStep local={local} control={control} errors={errors} previousVisit={previousVisit} onChange={updateDraft} />}
      {step === 1 && <BedStep local={local} onChange={updateDraft} />}
      {step === 2 && <VitalsAndScalesStep local={local} onChange={updateDraft} />}
      {step === 3 && <ProductsStep local={local} onChange={updateDraft} ensureSaved={() => persist()} />}
      {step === 4 && <TherapiesStep local={local} onChange={updateDraft} professionalName={profile?.name ?? ''} />}
      {step === 5 && <PhotosStep local={local} onChange={updateDraft} addPhoto={source => void addPhoto(source)} photoBusy={photoBusy} onRemovePhoto={removePhoto} onSavePhoto={async photo => { updateDraft({ photos: localRef.current.photos.map(item => item.id === photo.id ? photo : item) }); await persist(); }} />}
      {step === 6 && <ConductStep local={local} patient={patient} wound={wound} onChange={updateDraft} onSaveSOAP={saveSOAP} authorName={profile?.name} />}
      {step === 6 && <View style={{ gap: 12 }}>
        <Txt style={{ fontSize: 16, lineHeight: 23 }}>Ao concluir, o registro original será preservado com seu nome, conselho, registro e data. Correções serão adicionadas como adendos. Esta confirmação não é uma assinatura digital certificada.</Txt>
        {reviewing ? <><Txt style={{ fontFamily: fonts.semibold }}>Revise os dados e confirme a conclusão.</Txt><Button title="Confirmar conclusão do atendimento" icon={Check} loading={saving} onPress={() => void complete()} /><Button title="Continuar revisando" variant="outline" onPress={() => setReviewing(false)} /></> : <Button title="Concluir atendimento" icon={Check} onPress={() => setReviewing(true)} />}
      </View>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
        {step > 0 && <Button title="Etapa anterior" variant="outline" icon={ChevronLeft} onPress={() => void goToStep(step - 1)} style={{ flex: 1, minWidth: 140 }} />}
        {step < 6 && <Button title="Próxima etapa" icon={ChevronRight} loading={saving} onPress={() => void goToStep(step + 1)} style={{ flex: 1, minWidth: 140 }} />}
      </View>
    </ScrollView>
  </View>;
}

// ============================================================
// ETAPA 0: MENSURAÇÃO
// ============================================================
const cleanDecimal = (val: string) => {
  const sanitized = val.replace(/\./g, ',').replace(/[^0-9,]/g, '');
  const parts = sanitized.split(',');
  return parts.length > 1 ? parts[0] + ',' + parts.slice(1).join('') : sanitized;
};

function MeasurementStep({
  local,
  control,
  errors,
  onChange,
  previousVisit
}: {
  local: Visit;
  control: any;
  errors: any;
  onChange: (value: Partial<Visit>) => void;
  previousVisit?: Visit;
}) {
  const currentArea = local.length && local.width ? area(local) : 0;
  const currentVol = local.length && local.width && local.depth
    ? decimal(local.length) * decimal(local.width) * decimal(local.depth)
    : 0;

  const prevArea = previousVisit?.length && previousVisit?.width ? area(previousVisit) : 0;
  const areaReduction = prevArea > 0 && currentArea > 0
    ? Math.round(((prevArea - currentArea) / prevArea) * 100)
    : null;

  return (
    <View style={{ gap: 18 }}>
      <SectionTitle title="DIMENSÕES DA LESÃO" />

      {/* Inputs de Medidas */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Controller
          control={control}
          name="length"
          render={({ field }) => (
            <Field
              label={"Comprimento\n(cm)"}
              placeholder="Ex.: 4,5"
              keyboardType="decimal-pad"
              value={field.value}
              onChangeText={val => {
                const formatted = cleanDecimal(val);
                field.onChange(formatted);
                onChange({ length: formatted });
              }}
              onBlur={field.onBlur}
              error={errors.length?.message}
              containerStyle={{ flex: 1, minWidth: 0 }}
              labelContainerStyle={{ minHeight: 36, justifyContent: 'flex-start' }}
              labelStyle={{ fontSize: 13, lineHeight: 18 }}
            />
          )}
        />
        <Controller
          control={control}
          name="width"
          render={({ field }) => (
            <Field
              label={"Largura\n(cm)"}
              placeholder="Ex.: 3,2"
              keyboardType="decimal-pad"
              value={field.value}
              onChangeText={val => {
                const formatted = cleanDecimal(val);
                field.onChange(formatted);
                onChange({ width: formatted });
              }}
              onBlur={field.onBlur}
              error={errors.width?.message}
              containerStyle={{ flex: 1, minWidth: 0 }}
              labelContainerStyle={{ minHeight: 36, justifyContent: 'flex-start' }}
              labelStyle={{ fontSize: 13, lineHeight: 18 }}
            />
          )}
        />
        <Controller
          control={control}
          name="depth"
          render={({ field }) => (
            <Field
              label={"Profundidade\n(cm)"}
              placeholder="Ex.: 0,5"
              keyboardType="decimal-pad"
              value={field.value}
              onChangeText={val => {
                const formatted = cleanDecimal(val);
                field.onChange(formatted);
                onChange({ depth: formatted });
              }}
              onBlur={field.onBlur}
              error={errors.depth?.message}
              containerStyle={{ flex: 1, minWidth: 0 }}
              labelContainerStyle={{ minHeight: 36, justifyContent: 'flex-start' }}
              labelStyle={{ fontSize: 13, lineHeight: 18 }}
            />
          )}
        />
      </View>

      {/* Card Minimalista de Cálculo */}
      <Card style={{ padding: 18 }}>
        <View style={[s.between, { flexWrap: 'wrap', gap: 12 }]}>
          <View style={{ gap: 3, minWidth: 90 }}>
            <Label>ÁREA CALCULADA</Label>
            <Txt style={{ fontFamily: fonts.semibold, fontSize: 20 }}>
              {currentArea > 0 ? `${number(currentArea)} cm²` : '—'}
            </Txt>
          </View>

          <View style={{ gap: 3, minWidth: 90 }}>
            <Label>VOLUME ESTIMADO</Label>
            <Txt style={{ fontFamily: fonts.semibold, fontSize: 20 }}>
              {currentVol > 0 ? `${number(currentVol)} cm³` : '—'}
            </Txt>
          </View>

          {areaReduction !== null && (
            <Badge tone={areaReduction >= 0 ? 'green' : 'red'}>
              {areaReduction >= 0 ? `↓ ${areaReduction}%` : `↑ ${Math.abs(areaReduction)}%`}
            </Badge>
          )}
        </View>
      </Card>

      {/* Túnel e Solapamento */}
      <View style={{ gap: 10 }}>
        <SectionTitle title="TÚNEL OU SOLAPAMENTO" />
        <Choices
          options={['Sem túnel', '12h–3h', '3h–6h', '6h–9h', '9h–12h']}
          value={local.tunnels ? local.tunnels.split(' · ')[0] : 'Sem túnel'}
          onChange={val => onChange({ tunnels: val === 'Sem túnel' ? '' : val })}
        />
        <Field
          label="Descrição detalhada (opcional)"
          placeholder="Ex.: Solapamento de 3h às 5h com 1,2 cm"
          value={local.tunnels}
          onChangeText={t => onChange({ tunnels: t })}
        />
      </View>

      {/* Bordas e Pele */}
      <View style={{ gap: 10 }}>
        <SectionTitle title="BORDAS DA LESÃO" />
        <Choices
          options={['Aderidas', 'Não aderidas', 'Maceradas', 'Epiboladas', 'Hiperqueratósicas']}
          value={local.edges}
          onChange={edges => onChange({ edges })}
          multiple
        />
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle title="PELE PERILESIONAL" />
        <Choices
          options={['Íntegra', 'Macerada', 'Eritematosa', 'Descamativa', 'Hiperpigmentada']}
          value={local.perilesional}
          onChange={perilesional => onChange({ perilesional })}
          multiple
        />
      </View>
    </View>
  );
}

// ============================================================
// ETAPA 1: LEITO, EXSUDATO E ESCALA DE DOR (EVA)
// ============================================================
function BedStep({ local, onChange }: { local: Visit; onChange: (value: Partial<Visit>) => void }) {
  const { colors } = useTheme();
  const tissues = ['Granulação', 'Esfacelo', 'Necrose', 'Epitelização'];
  const total = Object.values(local.tissue).reduce((sum, value) => sum + value, 0);
  return <View style={{ gap: 22 }}>
    <View style={{ gap: 12 }}>
      <SectionTitle title="TECIDOS DA FERIDA" />
      <Txt muted>Informe apenas o que foi avaliado. Os percentuais informados devem somar 100%.</Txt>
      <Badge tone={total === 100 ? 'green' : 'amber'}>{Object.keys(local.tissue).length ? 'Total informado: ' + total + '%' : 'Ainda não avaliado'}</Badge>
      {tissues.map(name => <View key={name} style={[styles.sliderBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Txt style={{ fontFamily: fonts.semibold }}>{name}: {local.tissue[name] ?? 0}%</Txt>
        <Slider accessibilityLabel={'Percentual de ' + name} minimumValue={0} maximumValue={100} step={5} value={local.tissue[name] ?? 0}
          onValueChange={value => onChange({ tissue: { ...local.tissue, [name]: value } })} minimumTrackTintColor={colors.red} maximumTrackTintColor={colors.border} thumbTintColor={colors.red} style={{ width: '100%', height: 48 }} />
      </View>)}
      <Button title="Limpar distribuição de tecidos" variant="outline" onPress={() => onChange({ tissue: {} })} />
    </View>
    <View style={{ gap: 10 }}><SectionTitle title="QUANTIDADE DE SECREÇÃO (EXSUDATO)" /><Choices options={['Ausente', 'Pequena', 'Moderada', 'Grande']} value={local.exudateAmount} onChange={exudateAmount => onChange({ exudateAmount })} /></View>
    <View style={{ gap: 10 }}><SectionTitle title="ASPECTO DA SECREÇÃO" /><Choices options={['Seroso', 'Serossanguinolento', 'Sanguinolento', 'Purulento']} value={local.exudateType} onChange={exudateType => onChange({ exudateType })} /></View>
    <View style={{ gap: 10 }}><SectionTitle title="ODOR" /><Choices options={['Ausente', 'Presente', 'Fétido']} value={local.odor} onChange={odor => onChange({ odor })} /></View>
    <View style={{ gap: 10 }}><SectionTitle title="SINAIS OBSERVADOS" /><Choices options={['Calor', 'Rubor', 'Edema', 'Dor', 'Odor fétido', 'Exsudato purulento', 'Tecido friável']} value={local.infection} multiple onChange={infection => onChange({ infection })} /></View>
    <View style={{ gap: 10 }}>
      <SectionTitle title="INTENSIDADE DA DOR" /><Txt muted>Escala visual analógica (EVA): 0 é sem dor e 10 é a pior dor relatada.</Txt>
      <Txt style={{ fontFamily: fonts.semibold }}>{local.pain === null ? 'Dor não avaliada' : 'Dor informada: ' + local.pain + ' de 10'}</Txt>
      <Choices options={Array.from({ length: 11 }, (_, index) => String(index))} value={local.pain === null ? '' : String(local.pain)} onChange={value => onChange({ pain: Number(value) })} />
      <Button title="Marcar dor como não avaliada" variant="outline" onPress={() => onChange({ pain: null })} />
    </View>
  </View>;
}

// ============================================================
// ETAPA 2: SINAIS VITAIS E ESCALAS
// ============================================================
function VitalsAndScalesStep({ local, onChange }: { local: Visit; onChange: (value: Partial<Visit>) => void }) {
  const vitals = { ...emptyVitals(), ...local.vitals };
  const fields: { key: keyof typeof vitals; label: string; placeholder: string }[] = [
    { key: 'systolic', label: 'Pressão sistólica (mmHg)', placeholder: 'Ex.: 120' },
    { key: 'diastolic', label: 'Pressão diastólica (mmHg)', placeholder: 'Ex.: 80' },
    { key: 'heartRate', label: 'Frequência cardíaca (batimentos/min)', placeholder: 'Ex.: 72' },
    { key: 'temperature', label: 'Temperatura (°C)', placeholder: 'Ex.: 36,5' },
    { key: 'oxygen', label: 'Saturação de oxigênio (%)', placeholder: 'Ex.: 98' },
    { key: 'glucose', label: 'Glicemia (mg/dL)', placeholder: 'Ex.: 110' },
  ];
  return <View style={{ gap: 16 }}>
    <SectionTitle title="SINAIS VITAIS" />
    <Txt muted>Campos opcionais. Deixe em branco o que não foi medido. Os valores são registrados sem interpretação automática.</Txt>
    {fields.map(field => <Field key={field.key} label={field.label} placeholder={field.placeholder} keyboardType="decimal-pad" value={vitals[field.key]}
      onChangeText={value => onChange({ vitals: { ...vitals, [field.key]: value.replace(/[^0-9,.]/g, '') } })} />)}
    {vitalErrors(vitals).map(error => <Txt key={error} accessibilityRole="alert">{error}</Txt>)}
    <Txt muted style={{ lineHeight: 23 }}>A classificação de ferida, isquemia e infecção do pé (WIfI) permanece desativada até a revisão clínica prevista no projeto.</Txt>
  </View>;
}

// ============================================================
// ETAPA 3: COBERTURAS E CURATIVOS
// ============================================================
function ProductsStep({ local, onChange, ensureSaved }: { local: Visit; onChange: (value: Partial<Visit>) => void; ensureSaved: () => Promise<void> }) {
  const update = (id: string, patch: Partial<Visit['dressings'][number]>) => onChange({ dressings: local.dressings.map(item => item.id === id ? { ...item, ...patch } : item) });
  return <View style={{ gap: 18 }}>
    <SectionTitle title="CURATIVOS UTILIZADOS" />
    <Txt muted>Registre o material realmente utilizado. Cada produto mantém sua apresentação, quantidade e frequência.</Txt>
    {local.dressings.map((product, index) => <Card key={product.id} style={{ gap: 14 }}>
      <Txt style={{ fontFamily: fonts.semibold, fontSize: 18 }}>Curativo {index + 1}</Txt>
      <Field label="Produto ou cobertura" value={product.product} onChangeText={value => update(product.id, { product: value })} />
      <Field label="Apresentação" placeholder="Ex.: placa de 10 × 10 cm" value={product.presentation} onChangeText={value => update(product.id, { presentation: value })} />
      <Field label="Quantidade utilizada" placeholder="Ex.: 1 unidade" value={product.quantity} onChangeText={value => update(product.id, { quantity: value })} />
      <Choices options={['Primária', 'Secundária', 'Fixação']} value={product.layer} onChange={layer => update(product.id, { layer })} />
      <Field label="Frequência de troca" placeholder="Ex.: a cada 48 horas" value={product.frequency} onChangeText={value => update(product.id, { frequency: value })} />
      <Field label="Observações do curativo" multiline value={product.note} onChangeText={note => update(product.id, { note })} />
      <Button title="Remover este curativo" icon={Trash2} variant="outline" onPress={() => onChange({ dressings: local.dressings.filter(item => item.id !== product.id) })} />
    </Card>)}
    {!local.dressings.length && <Txt>Nenhum curativo registrado neste atendimento.</Txt>}
    <Button title="Adicionar curativo" icon={Plus} variant="outline" onPress={() => { onChange({ dressings: [...local.dressings, { id: uid(), product: '', presentation: '', quantity: '', layer: '', frequency: '', start: new Date().toISOString(), note: '' }] }); }} />
    <ClinicalInventoryUse visit={local} ensureSaved={ensureSaved} />
  </View>;
}

// ============================================================
// ETAPA 4: TERAPIAS COMPLEMENTARES
// ============================================================
function TherapiesStep({ local, onChange, professionalName }: { local: Visit; onChange: (value: Partial<Visit>) => void; professionalName: string }) {
  const update = (id: string, patch: Partial<Visit['therapies'][number]>) => onChange({ therapies: local.therapies.map(item => item.id === id ? { ...item, ...patch } : item) });
  return <View style={{ gap: 18 }}>
    <SectionTitle title="TERAPIAS REALIZADAS" />
    <Txt muted>Registre procedimentos realizados. O aplicativo não recomenda terapias nem define parâmetros.</Txt>
    {local.therapies.map((therapy, index) => <Card key={therapy.id} style={{ gap: 14 }}>
      <Txt style={{ fontFamily: fonts.semibold, fontSize: 18 }}>Procedimento {index + 1}</Txt>
      <Field label="Nome da terapia ou procedimento" value={therapy.type} onChangeText={type => update(therapy.id, { type })} />
      <Field label="Duração (minutos)" keyboardType="number-pad" value={therapy.duration ? String(therapy.duration) : ''} onChangeText={duration => update(therapy.id, { duration: Number(duration.replace(/\D/g, '')) })} />
      <Field label="Parâmetros e observações" multiline placeholder="Descreva os parâmetros efetivamente utilizados." value={therapy.note} onChangeText={note => update(therapy.id, { note })} />
      <Field label="Profissional responsável pelo procedimento" value={therapy.professional} onChangeText={professional => update(therapy.id, { professional })} />
      <Button title="Remover este procedimento" icon={Trash2} variant="outline" onPress={() => onChange({ therapies: local.therapies.filter(item => item.id !== therapy.id) })} />
    </Card>)}
    {!local.therapies.length && <Txt>Nenhum procedimento registrado neste atendimento.</Txt>}
    <Button title="Adicionar procedimento" icon={Plus} variant="outline" onPress={() => onChange({ therapies: [...local.therapies, { id: uid(), type: '', parameters: {}, duration: 0, note: '', professional: professionalName, date: new Date().toISOString() }] })} />
  </View>;
}

// ============================================================
// ETAPA 5: FOTOGRAFIAS CLÍNICAS
// ============================================================
function PhotosStep({ local, onChange, addPhoto, photoBusy, onRemovePhoto, onSavePhoto }: {
  local: Visit; onChange: (value: Partial<Visit>) => void; addPhoto: (source: 'camera' | 'library') => void;
  photoBusy: boolean; onRemovePhoto: (photoId: string) => void; onSavePhoto: (photo: Photo) => Promise<void>;
}) {
  const [calibrating, setCalibrating] = useState('');
  const [removing, setRemoving] = useState('');
  return <View style={{ gap: 18 }}>
    <SectionTitle title="FOTOS DA FERIDA" />
    <Txt muted>Use fotos autorizadas para acompanhar esta ferida. A referência de escala é opcional; ela não substitui as medidas clínicas.</Txt>
    <Button title="Fotografar com a câmera" icon={Camera} variant="outline" loading={photoBusy} onPress={() => addPhoto('camera')} />
    <Button title="Escolher foto da galeria" icon={Plus} variant="outline" disabled={photoBusy} onPress={() => addPhoto('library')} />
    {local.photos.map((photo, index) => <Card key={photo.id} style={{ gap: 14 }}>
      <Image source={{ uri: photo.uri }} accessibilityLabel={'Fotografia ' + (index + 1) + ' da ferida'} style={{ width: '100%', height: 200, borderRadius: 12 }} resizeMode="contain" />
      <Txt style={{ fontFamily: fonts.semibold, fontSize: 18 }}>Foto {index + 1}</Txt>
      <Txt muted>{dateLabel(photo.date, 'dd/MM/yyyy HH:mm')} · {photo.rulerConfirmed ? 'Com referência de escala' : 'Sem referência de escala'}</Txt>
      <Choices options={['Panorâmica', 'Aproximação', 'Leito da ferida', 'Pele perilesional']} value={photo.type} onChange={type => onChange({ photos: local.photos.map(item => item.id === photo.id ? { ...item, type } : item) })} />
      <Button title={calibrating === photo.id ? 'Fechar referência de escala' : 'Definir referência de escala'} variant="outline" onPress={() => setCalibrating(calibrating === photo.id ? '' : photo.id)} />
      {calibrating === photo.id && <ClinicalPhotoCalibration photo={photo} onSave={onSavePhoto} />}
      {removing === photo.id ? <><Txt>Remover esta fotografia do rascunho?</Txt><Button title="Confirmar remoção da foto" icon={Trash2} variant="outline" onPress={() => { onRemovePhoto(photo.id); setRemoving(''); }} /><Button title="Manter foto" variant="ghost" onPress={() => setRemoving('')} /></> : <Button title="Remover esta foto" icon={Trash2} variant="outline" onPress={() => setRemoving(photo.id)} />}
    </Card>)}
    {!local.photos.length && <Empty icon={Camera} title="Nenhuma foto anexada" description="Fotografe a ferida ou escolha uma imagem já registrada, com autorização do paciente." />}
  </View>;
}

// ============================================================
// ETAPA 6: CONDUTA, RETORNO E ASSINATURA DIGITAL
// ============================================================
function ConductStep({ local, patient, wound, onChange, onSaveSOAP, authorName }: {
  local: Visit; patient: Patient; wound: Wound; onChange: (value: Partial<Visit>) => void; onSaveSOAP: (soap: SOAPNote) => Promise<void>; authorName?: string;
}) {
  const [templateType, setTemplateType] = useState<'conduta' | 'orientacoes' | undefined>();
  const returnPresets = [{ label: '48 horas', days: 2 }, { label: '7 dias', days: 7 }, { label: '14 dias', days: 14 }, { label: '21 dias', days: 21 }, { label: '30 dias', days: 30 }];
  return <View style={{ gap: 22 }}>
    <View style={{ gap: 12 }}>
      <SectionTitle title="PLANO DE CUIDADO" />
      <Field label="Conduta realizada" multiline placeholder="Descreva o cuidado realizado, os materiais utilizados e as orientações." value={local.plan} onChangeText={plan => onChange({ plan })} />
      <Button title="Acrescentar modelo de conduta" variant="outline" onPress={() => setTemplateType('conduta')} />
    </View>
    <View style={{ gap: 12 }}>
      <SectionTitle title="ORIENTAÇÕES AO PACIENTE" />
      <Field label="Orientações de autocuidado" multiline value={local.guidance} placeholder="Registre as orientações que foram dadas ao paciente." onChangeText={guidance => onChange({ guidance })} />
      <Button title="Acrescentar modelo de orientações" variant="outline" onPress={() => setTemplateType('orientacoes')} />
    </View>
    <View style={{ gap: 12 }}>
      <SectionTitle title="RETORNO" />
      <Choices options={returnPresets.map(p => p.label)} value={returnPresets.find(p => format(addDays(new Date(), p.days), 'yyyy-MM-dd') === local.returnDate)?.label ?? ''} onChange={value => {
        const preset = returnPresets.find(p => p.label === value);
        if (preset) onChange({ returnDate: format(addDays(new Date(), preset.days), 'yyyy-MM-dd'), returnTime: local.returnTime || '09:00' });
      }} />
      <DateField label="Data do retorno" value={local.returnDate} onChange={returnDate => onChange({ returnDate, returnTime: returnDate ? local.returnTime || '09:00' : '' })} />
      {Boolean(local.returnDate) && <><Field label="Horário do retorno (HH:mm)" placeholder="09:00" value={local.returnTime || '09:00'} keyboardType="number-pad" maxLength={5} onChangeText={returnTime => {
        const digits = returnTime.replace(/\D/g, '').slice(0, 4);
        onChange({ returnTime: digits.length > 2 ? digits.slice(0, 2) + ':' + digits.slice(2) : digits });
      }} /><Txt muted>O lembrete depende da permissão de notificações do Android. Confira a confirmação na Agenda.</Txt><Button title="Remover data de retorno" variant="outline" onPress={() => onChange({ returnDate: '', returnTime: '' })} /></>}
    </View>
    <SOAPEditor visit={local} patient={patient} wound={wound} authorName={authorName} onChange={soap => onChange({ soap })} onSave={onSaveSOAP} />
    <TemplatePickerModal visible={Boolean(templateType)} type={templateType} onClose={() => setTemplateType(undefined)} onSelect={template => {
      const key = templateType === 'orientacoes' ? 'guidance' : 'plan';
      const text = String(template.content[key] ?? template.content.text ?? template.content.observations ?? '').trim();
      if (text) onChange({ [key]: [local[key], text].filter(Boolean).join('\n\n') });
      setTemplateType(undefined);
    }} />
  </View>;
}

// ============================================================
// ESTILOS GLOBAIS DO ATENDIMENTO CLÍNICO
// ============================================================
const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  topbar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  brand: {
    fontFamily: fonts.brand,
    fontSize: 26,
    letterSpacing: -0.8,
  },
  content: {
    paddingTop: 16,
    paddingBottom: 40,
    gap: 18,
    width: '100%',
    maxWidth: 840,
    alignSelf: 'center',
  },
  sliderBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
});
