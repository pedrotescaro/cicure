import React, { useState, useMemo } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { addDays, format } from 'date-fns';
import { 
  Camera, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Copy, 
  Plus, 
  Save, 
  ShieldAlert, 
  Bookmark, 
  X,
  Trash2
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { Avatar, Badge, Button, Card, Choices, Empty, Field, IconButton, Label, Pills, SectionTitle, Txt, safeBack, s } from './components';
import { fonts, useTheme } from './theme';
import { area, decimal, measurementSchema, number, visitErrors } from '../domain/clinical';
import { useStore, uid } from '../data/store';
import type { Patient, Visit, Wound } from '../domain/types';
import { newVisit } from '../domain/demo';
import { duplicateVisit, duplicateSummary } from '../features/duplicate-visit/domain/duplicate-visit.service';
import { TemplatePickerModal } from '../features/templates/ui/TemplatePickerModal';
import type { ClinicalTemplate } from '../features/templates/domain/types';
import SOAPEditor from '../features/soap/ui/SOAPEditor';
import VitalsForm from '../features/vitals/ui/VitalsForm';
import VascularAssessmentForm from '../features/vitals/ui/VascularAssessmentForm';

const stepOptions = ['Medidas', 'Leito & Dor', 'Sinais', 'Coberturas', 'Terapias', 'Fotos', 'Conduta'];

type FormValues = Pick<Visit, 'length' | 'width' | 'depth'>;

export function CareWizard({ visitId, patientId, woundId }: { visitId?: string; patientId?: string; woundId?: string }) {
  const router = useRouter();
  const store = useStore();
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const scrollRef = React.useRef<ScrollView>(null);

  const scrollToTop = () => {
    // 1. React Native ScrollView nativo
    scrollRef.current?.scrollTo({ y: 0, animated: false });

    // 2. React Native Web / DOM / Window
    if (Platform.OS === 'web') {
      try {
        const node = (scrollRef.current as any)?.getScrollableNode?.() ?? scrollRef.current;
        if (node && typeof (node as any).scrollTo === 'function') {
          (node as any).scrollTo({ top: 0, left: 0, behavior: 'auto' });
        }
        if (node && typeof (node as any).scrollTop !== 'undefined') {
          (node as any).scrollTop = 0;
        }
      } catch {}

      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0 });
      }
      if (typeof document !== 'undefined') {
        if (document.documentElement) {
          document.documentElement.scrollTop = 0;
          document.documentElement.scrollTo({ top: 0, left: 0 });
        }
        if (document.body) {
          document.body.scrollTop = 0;
          document.body.scrollTo({ top: 0, left: 0 });
        }
        if (document.activeElement && typeof (document.activeElement as HTMLElement).blur === 'function') {
          (document.activeElement as HTMLElement).blur();
        }
        const scrollables = document.querySelectorAll('[style*="overflow"]');
        scrollables.forEach(el => {
          el.scrollTop = 0;
        });
      }
    }
  };

  const goToStep = (nextStep: number) => {
    setStep(nextStep);
    scrollToTop();
    setTimeout(scrollToTop, 10);
    setTimeout(scrollToTop, 50);
    setTimeout(scrollToTop, 150);
  };

  React.useEffect(() => {
    scrollToTop();
    const t1 = setTimeout(scrollToTop, 10);
    const t2 = setTimeout(scrollToTop, 50);
    const t3 = setTimeout(scrollToTop, 150);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [step]);

  const [local, setLocal] = useState<Visit>(() => {
    const found = visitId ? store.data.visits.find(v => v.id === visitId) : undefined;
    if (found) return found;
    const p = patientId ?? store.data.patients[0]?.id ?? '';
    const w = woundId ?? store.data.wounds.find(x => x.patientId === p)?.id ?? '';
    return newVisit(uid(), p, w);
  });

  const patient = store.data.patients.find(p => p.id === local.patientId);
  const wound = store.data.wounds.find(w => w.id === local.woundId);

  // Busca atendimento anterior do mesmo paciente/ferida
  const previousVisit = store.data.visits
    .filter(v => v.patientId === local.patientId && v.woundId === local.woundId && v.state === 'Concluído' && v.id !== local.id)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(measurementSchema),
    defaultValues: { length: local.length, width: local.width, depth: local.depth },
    mode: 'onChange'
  });

  const persist = async (next: Visit = local) => {
    setSaving(true);
    try {
      await store.save('visits', next);
      setLocal(next);
    } finally {
      setSaving(false);
    }
  };

  const saveMeasurement = handleSubmit(async values => {
    const next = { ...local, ...values };
    setLocal(next);
    await persist(next);
  });

  const handleUsePreviousVisit = () => {
    if (!previousVisit) {
      Alert.alert('Nenhum Atendimento Anterior', 'Não há atendimento concluído prévio registrado para esta ferida.');
      return;
    }

    const { visit: duplicated } = duplicateVisit(previousVisit, local);
    setLocal(duplicated);
    void persist(duplicated);

    const summary = duplicateSummary(previousVisit);
    Alert.alert(
      'Dados Importados',
      `Foram copiadas condutas e coberturas usuais:\n• ${summary.join('\n• ')}`
    );
  };

  const handleApplyTemplate = (tmpl: ClinicalTemplate) => {
    if (tmpl.type === 'curativo' && tmpl.content) {
      const nextDressing = {
        id: uid(),
        product: tmpl.content.primaryCoverage || tmpl.content.product || 'Cobertura',
        presentation: tmpl.content.presentation || '',
        quantity: tmpl.content.quantity || '1 un',
        layer: tmpl.content.layer || 'Primária',
        frequency: tmpl.content.changeFrequency || tmpl.content.frequency || 'A cada 48h',
        start: new Date().toISOString(),
        note: tmpl.content.note || ''
      };
      const next = { ...local, dressings: [nextDressing] };
      setLocal(next);
      void persist(next);
      Alert.alert('Template Aplicado', `Os dados do template "${tmpl.name}" foram inseridos no atendimento.`);
    } else if (tmpl.type === 'conduta' && tmpl.content) {
      const next = {
        ...local,
        plan: tmpl.content.plan || local.plan,
        guidance: tmpl.content.guidance || local.guidance
      };
      setLocal(next);
      void persist(next);
      Alert.alert('Template Aplicado', 'O texto do protocolo foi adicionado aos campos de conduta.');
    }
  };

  const complete = async () => {
    const problems = visitErrors(local);
    if (problems.length) {
      Alert.alert('Atenção', problems.join('\n'));
      return;
    }
    const next = { ...local, state: 'Concluído' as const, date: new Date().toISOString() };
    await persist(next);
    Alert.alert(
      'Atendimento Concluído',
      'O registro foi assinado e salvo com sucesso no prontuário.',
      [{ text: 'Ver Prontuário', onPress: () => safeBack(router, local.patientId ? `/patient/${local.patientId}` : '/care') }]
    );
  };

  const addPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const next = {
      ...local,
      photos: [
        ...local.photos,
        {
          id: uid(),
          uri: asset.uri,
          date: new Date().toISOString(),
          rulerConfirmed: false,
          contour: [],
          width: asset.width,
          height: asset.height,
          type: 'Leito da ferida'
        }
      ]
    };
    setLocal(next);
    await persist(next);
  };

  const removePhoto = async (photoId: string) => {
    const next = {
      ...local,
      photos: local.photos.filter(p => p.id !== photoId)
    };
    setLocal(next);
    await persist(next);
  };

  if (!patient || !wound) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Empty 
          title="Selecione paciente e ferida" 
          description="O atendimento precisa estar vinculado a um prontuário cadastrado."
          action="Voltar"
          onPress={() => safeBack(router, '/care')} 
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView 
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content, 
          { paddingHorizontal: isNarrow ? 16 : 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Topbar padrão das telas Home e Pacientes */}
        <View style={styles.topbar}>
          <Txt style={[styles.brand, { color: colors.red }]}>cicure</Txt>
          <View style={s.row}>
            <IconButton 
              icon={Save} 
              label="Salvar rascunho" 
              color={saving ? colors.red : colors.secondary} 
              onPress={() => void persist()} 
            />
            <IconButton 
              icon={X} 
              label="Fechar" 
              onPress={() => safeBack(router, '/care')} 
            />
          </View>
        </View>

        {/* Título Principal com o padrão exato s.h1 e Comfortaa */}
        <View style={{ gap: 4 }}>
          <Txt style={s.h1}>Atendimento</Txt>
          <Txt muted style={{ fontSize: 13 }}>
            {store.presentation ? 'Paciente em acompanhamento' : patient.name} · {wound.location}
          </Txt>
        </View>

        {/* Card Minimalista do Paciente */}
        <Card style={{ padding: 18 }}>
          <View style={s.between}>
            <View style={[s.row, { flex: 1, minWidth: 0 }]}>
              <Avatar name={patient.name} color={patient.color} size={42} anonymous={store.presentation} />
              <View style={{ gap: 2, flex: 1, minWidth: 0 }}>
                <Txt style={{ fontFamily: fonts.semibold, fontSize: 16 }} numberOfLines={1}>
                  {store.presentation ? 'Paciente em apresentação' : patient.name}
                </Txt>
                <Txt muted style={{ fontSize: 12 }}>
                  {wound.location} · {wound.etiology}
                </Txt>
              </View>
            </View>
            {previousVisit && (
              <Button 
                title="Copiar anterior" 
                variant="outline" 
                icon={Copy} 
                small 
                onPress={handleUsePreviousVisit} 
              />
            )}
          </View>
        </Card>

        {/* Seletor de Etapas usando o componente padrão Pills (idêntico a Pacientes) */}
        <Pills 
          options={stepOptions} 
          value={stepOptions[step]} 
          onChange={opt => {
            void persist();
            goToStep(stepOptions.indexOf(opt));
          }} 
        />

        {/* ============================================================ */}
        {/* Renderização Condicional da Etapa Ativa */}
        {/* ============================================================ */}
        {step === 0 && (
          <MeasurementStep 
            local={local} 
            control={control} 
            errors={errors} 
            previousVisit={previousVisit}
            onChange={next => setLocal(v => ({ ...v, ...next }))} 
          />
        )}

        {step === 1 && (
          <BedStep 
            local={local} 
            onChange={next => setLocal(v => ({ ...v, ...next }))} 
          />
        )}

        {step === 2 && (
          <VitalsAndScalesStep 
            local={local} 
            onChange={next => setLocal(v => ({ ...v, ...next }))} 
          />
        )}

        {step === 3 && (
          <ProductsStep 
            local={local} 
            onChange={next => setLocal(v => ({ ...v, ...next }))} 
            onOpenTemplates={() => setTemplateModalVisible(true)} 
          />
        )}

        {step === 4 && (
          <TherapiesStep 
            local={local} 
            onChange={next => setLocal(v => ({ ...v, ...next }))} 
          />
        )}

        {step === 5 && (
          <PhotosStep 
            local={local} 
            onChange={next => setLocal(v => ({ ...v, ...next }))} 
            addPhoto={addPhoto} 
            onRemovePhoto={removePhoto} 
          />
        )}

        {step === 6 && (
          <ConductStep 
            local={local} 
            patient={patient} 
            wound={wound} 
            onChange={next => setLocal(v => ({ ...v, ...next }))} 
          />
        )}

        {/* Botões de Navegação Integrados ao Fluxo (sem barra pesada sobreposta) */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 10, paddingBottom: 40 }}>
          {step > 0 && (
            <Button 
              title="Anterior" 
              variant="outline" 
              icon={ChevronLeft} 
              onPress={async () => {
                await persist();
                goToStep(Math.max(0, step - 1));
              }} 
              style={{ flex: 1 }} 
            />
          )}

          <Button 
            title={step === stepOptions.length - 1 ? "Concluir Atendimento" : "Próximo"} 
            variant={step === stepOptions.length - 1 ? "primary" : "dark"} 
            icon={step === stepOptions.length - 1 ? Check : ChevronRight} 
            loading={saving} 
            onPress={async () => {
              if (step === stepOptions.length - 1) {
                await complete();
              } else {
                if (step === 0) await saveMeasurement();
                else await persist();
                goToStep(Math.min(stepOptions.length - 1, step + 1));
              }
            }} 
            style={{ flex: step > 0 ? 1.5 : 1 }} 
          />
        </View>
      </ScrollView>

      {/* Modal Seletor de Templates Clínicos */}
      <TemplatePickerModal 
        visible={templateModalVisible}
        type="curativo"
        onSelect={handleApplyTemplate}
        onClose={() => setTemplateModalVisible(false)}
      />
    </View>
  );
}

// ============================================================
// ETAPA 0: MENSURAÇÃO
// ============================================================
const cleanDecimal = (val: string) => {
  const sanitized = val.replace(',', '.').replace(/[^0-9.]/g, '');
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    return `${parts[0]}.${parts.slice(1).join('')}`;
  }
  return sanitized;
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
              placeholder="Ex.: 4.5"
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
              placeholder="Ex.: 3.2"
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
              placeholder="Ex.: 0.5"
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
  const { colors, isDark } = useTheme();
  const painPresets = [
    '0 - Sem dor',
    '2 - Leve',
    '4 - Moderada',
    '6 - Desconforto',
    '8 - Intensa',
    '10 - Insuportável'
  ];

  const currentPainPreset = useMemo(() => {
    if (local.pain === 0) return '0 - Sem dor';
    if (local.pain <= 2) return '2 - Leve';
    if (local.pain <= 4) return '4 - Moderada';
    if (local.pain <= 6) return '6 - Desconforto';
    if (local.pain <= 8) return '8 - Intensa';
    return '10 - Insuportável';
  }, [local.pain]);

  const tissues = useMemo(() => [
    { name: 'Granulação', color: '#D62828' },
    { name: 'Esfacelo', color: '#F59E0B' },
    { name: 'Necrose', color: '#1F2937' },
    { name: 'Epitelização', color: '#EC4899' }
  ], []);

  // Garante que a soma inicial seja exatamente 100% (evita 400% ou estados inconsistentes)
  React.useEffect(() => {
    const currentSum = tissues.reduce((acc, t) => acc + (local.tissue[t.name] ?? 0), 0);
    if (currentSum !== 100) {
      if (currentSum === 0) {
        onChange({
          tissue: {
            ...local.tissue,
            'Granulação': 100,
            'Esfacelo': 0,
            'Necrose': 0,
            'Epitelização': 0
          }
        });
      } else {
        let allocated = 0;
        const normalized: Record<string, number> = {};
        tissues.forEach((t, idx) => {
          if (idx === tissues.length - 1) {
            normalized[t.name] = Math.max(0, 100 - allocated);
          } else {
            const raw = ((local.tissue[t.name] ?? 0) / currentSum) * 100;
            const val = Math.max(0, Math.round(raw / 5) * 5);
            normalized[t.name] = Math.min(val, 100 - allocated);
            allocated += normalized[t.name];
          }
        });
        onChange({ tissue: { ...local.tissue, ...normalized } });
      }
    }
  }, []);

  const handleTissuePreset = (gran: number, esf: number, nec: number, epi: number) => {
    onChange({
      tissue: {
        ...local.tissue,
        'Granulação': gran,
        'Esfacelo': esf,
        'Necrose': nec,
        'Epitelização': epi
      }
    });
  };

  // Ajuste proporcional dinâmico dos sliders para que a soma seja SEMPRE exatamente 100%
  const handleSliderChange = (changedName: string, newValue: number) => {
    const roundedNew = Math.max(0, Math.min(100, Math.round(newValue / 5) * 5));
    const otherTissues = tissues.filter(t => t.name !== changedName);
    const remaining = 100 - roundedNew;

    if (remaining === 0) {
      const next: Record<string, number> = { [changedName]: 100 };
      otherTissues.forEach(t => { next[t.name] = 0; });
      onChange({ tissue: { ...local.tissue, ...next } });
      return;
    }

    const currentOtherSum = otherTissues.reduce((acc, t) => acc + (local.tissue[t.name] ?? 0), 0);
    const nextTissue: Record<string, number> = { [changedName]: roundedNew };

    if (currentOtherSum === 0) {
      const defaultTarget = changedName === 'Granulação' ? 'Esfacelo' : 'Granulação';
      otherTissues.forEach(t => {
        nextTissue[t.name] = t.name === defaultTarget ? remaining : 0;
      });
      onChange({ tissue: { ...local.tissue, ...nextTissue } });
      return;
    }

    let allocated = 0;
    otherTissues.forEach((t, idx) => {
      if (idx === otherTissues.length - 1) {
        nextTissue[t.name] = Math.max(0, remaining - allocated);
      } else {
        const share = (local.tissue[t.name] ?? 0) / currentOtherSum;
        const val = Math.max(0, Math.round((share * remaining) / 5) * 5);
        const safeVal = Math.min(val, remaining - allocated);
        nextTissue[t.name] = safeVal;
        allocated += safeVal;
      }
    });

    const totalCheck = Object.values(nextTissue).reduce((a, b) => a + b, 0);
    if (totalCheck !== 100) {
      const diff = 100 - totalCheck;
      const target = otherTissues.find(t => (nextTissue[t.name] ?? 0) + diff >= 0) ?? otherTissues[0];
      nextTissue[target.name] = Math.max(0, (nextTissue[target.name] ?? 0) + diff);
    }

    onChange({ tissue: { ...local.tissue, ...nextTissue } });
  };

  const total = tissues.reduce((acc, t) => acc + (local.tissue[t.name] || 0), 0);

  return (
    <View style={{ gap: 20 }}>
      {/* Tecidos do Leito */}
      <View style={{ gap: 14 }}>
        <View style={s.between}>
          <SectionTitle title="TECIDOS NO LEITO DA LESÃO (%)" />
          <Badge tone={total === 100 ? 'green' : 'amber'}>
            Total: {total}%
          </Badge>
        </View>

        {/* Presets Rápidos */}
        <Choices 
          options={['100% Granulação', '80% Gran / 20% Esf', '50% Gran / 50% Esf', '100% Necrose']} 
          value="" 
          onChange={val => {
            if (val === '100% Granulação') handleTissuePreset(100, 0, 0, 0);
            else if (val === '80% Gran / 20% Esf') handleTissuePreset(80, 20, 0, 0);
            else if (val === '50% Gran / 50% Esf') handleTissuePreset(50, 50, 0, 0);
            else if (val === '100% Necrose') handleTissuePreset(0, 0, 100, 0);
          }} 
        />

        {/* Sliders Interativos Auto-balanceados */}
        <View style={{ gap: 12, marginTop: 4 }}>
          {tissues.map(({ name, color }) => {
            const val = local.tissue[name] ?? 0;
            return (
              <View key={name} style={[styles.sliderBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={s.between}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                    <Txt style={{ fontFamily: fonts.semibold, fontSize: 14 }}>{name}</Txt>
                  </View>
                  <Txt style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.text }}>
                    {val}%
                  </Txt>
                </View>
                <Slider
                  minimumValue={0}
                  maximumValue={100}
                  step={5}
                  value={val}
                  onValueChange={v => handleSliderChange(name, v)}
                  minimumTrackTintColor={color}
                  maximumTrackTintColor={isDark ? '#2C2C30' : '#EAEAEA'}
                  thumbTintColor={color}
                  style={{ width: '100%', height: 38 }}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* Exsudato */}
      <View style={{ gap: 10 }}>
        <SectionTitle title="QUANTIDADE DE EXSUDATO" />
        <Choices 
          options={['Ausente', 'Pequena', 'Moderada', 'Grande']} 
          value={local.exudateAmount} 
          onChange={exudateAmount => onChange({ exudateAmount })} 
        />
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle title="ASPECTO DO EXSUDATO" />
        <Choices 
          options={['Seroso', 'Serossanguinolento', 'Sanguinolento', 'Purulento']} 
          value={local.exudateType} 
          onChange={exudateType => onChange({ exudateType })} 
        />
      </View>

      {/* Sinais de Alerta */}
      <View style={{ gap: 10 }}>
        <SectionTitle title="SINAIS DE INFECÇÃO OU ALERTA" />
        <Choices 
          options={['Calor', 'Rubor', 'Edema', 'Dor', 'Odor fétido', 'Exsudato purulento', 'Tecido friável']} 
          value={local.infection} 
          onChange={infection => onChange({ infection })} 
          multiple 
        />
      </View>

      {/* Escala de Dor EVA */}
      <View style={{ gap: 10 }}>
        <SectionTitle title="INTENSIDADE DA DOR (ESCALA EVA)" />
        <Choices 
          options={painPresets} 
          value={currentPainPreset} 
          onChange={val => {
            const num = Number(val.split(' ')[0]);
            onChange({ pain: num });
          }} 
        />
      </View>
    </View>
  );
}

// ============================================================
// ETAPA 2: SINAIS VITAIS E ESCALAS
// ============================================================
function VitalsAndScalesStep({ local, onChange }: { local: Visit; onChange: (value: Partial<Visit>) => void }) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const [i, setI] = useState(0);
  const [fi, setFi] = useState(0);

  const stages = [[0, 0, 0, 1], [0, 1, 1, 2], [1, 1, 2, 3], [2, 2, 2, 3], [3, 3, 3, 4]];
  const stage = stages[Math.min(4, Math.max(w, i, fi))][Math.min(3, Math.floor((w + i + fi) / 3))];

  const handleSaveWiFi = () => {
    onChange({
      assessments: [
        {
          code: 'WIfI',
          version: 'SVS 2019',
          answers: { wound: w, ischemia: i, footInfection: fi },
          score: stage,
          interpretation: `Estágio clínico ${stage}. Risco de amputação avaliado conforme matriz SVS.`,
          appliedAt: new Date().toISOString(),
          appliedBy: 'Profissional autenticado'
        },
        ...local.assessments.filter(a => a.code !== 'WIfI')
      ]
    });
    Alert.alert('Escala WIfI Salva', `Estágio clínico ${stage} registrado.`);
  };

  return (
    <View style={{ gap: 18 }}>
      {/* Sinais Vitais */}
      <VitalsForm onChange={() => {}} />

      {/* Avaliação Vascular */}
      <VascularAssessmentForm onChange={() => {}} />

      {/* Escala WIfI em Card Minimalista Padrão */}
      <Card style={{ padding: 18, gap: 14 }}>
        <View style={s.between}>
          <View style={s.row}>
            <ShieldAlert size={20} color={colors.red} />
            <Txt style={{ fontFamily: fonts.semibold, fontSize: 16 }}>WIfI · Estratificação SVS</Txt>
          </View>
          <Badge tone="red">Estágio {stage}</Badge>
        </View>

        <Txt muted style={{ fontSize: 12, lineHeight: 18 }}>
          Matriz oficial para estratificação e risco de amputação em membros inferiores (Wound, Ischemia, foot Infection).
        </Txt>

        <ScaleChoice label="Wound (Extensão e Profundidade)" value={w} setValue={setW} />
        <ScaleChoice label="Ischemia (Comprometimento Arterial)" value={i} setValue={setI} />
        <ScaleChoice label="foot Infection (Infecção Local ou Sistêmica)" value={fi} setValue={setFi} />

        <Button title="Salvar Escala WIfI" variant="outline" small onPress={handleSaveWiFi} />
      </Card>
    </View>
  );
}

function ScaleChoice({ label, value, setValue }: { label: string; value: number; setValue: (v: number) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Txt style={{ fontFamily: fonts.medium, fontSize: 13 }}>{label}</Txt>
      <Choices options={['0', '1', '2', '3']} value={String(value)} onChange={v => setValue(Number(v))} />
    </View>
  );
}

// ============================================================
// ETAPA 3: COBERTURAS E CURATIVOS
// ============================================================
function ProductsStep({ 
  local, 
  onChange, 
  onOpenTemplates 
}: { 
  local: Visit; 
  onChange: (value: Partial<Visit>) => void; 
  onOpenTemplates: () => void;
}) {
  const product = local.dressings[0];

  const commonDressings = [
    'Hidrogel com alginato',
    'Hidrofibra com prata',
    'Espuma de poliuretano',
    'Alginato de cálcio',
    'Bota de Unna',
    'Colagenase',
    'Carvão ativado'
  ];

  const frequencyOptions = [
    'Diária',
    'A cada 48h',
    'A cada 72h',
    'Semanal',
    'Conforme saturação'
  ];

  return (
    <View style={{ gap: 18 }}>
      <View style={s.between}>
        <SectionTitle title="COBERTURA UTILIZADA" />
        <Button 
          title="Usar Template" 
          icon={Bookmark} 
          variant="outline" 
          small 
          onPress={onOpenTemplates} 
        />
      </View>

      <Choices 
        options={commonDressings} 
        value={product?.product ?? ''} 
        onChange={name => onChange({ 
          dressings: [{ 
            id: product?.id ?? uid(), 
            product: name, 
            presentation: product?.presentation || 'Placa 10 × 10 cm', 
            quantity: product?.quantity || '1 un', 
            layer: product?.layer || 'Primária', 
            frequency: product?.frequency || 'A cada 48h', 
            start: new Date().toISOString(), 
            note: product?.note || '' 
          }] 
        })} 
      />

      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <Field 
          label="Apresentação" 
          placeholder="Ex.: Placa 10 × 10 cm" 
          value={product?.presentation ?? ''} 
          onChangeText={presentation => onChange({ dressings: [{ ...(product ?? { id: uid(), product: '', layer: 'Primária', start: new Date().toISOString() }), presentation }] as any })} 
          containerStyle={{ flex: 1, minWidth: 140 }}
        />
        <Field 
          label="Quantidade" 
          placeholder="Ex.: 1 un" 
          value={product?.quantity ?? ''} 
          onChangeText={quantity => onChange({ dressings: [{ ...(product ?? { id: uid(), product: '', layer: 'Primária', start: new Date().toISOString() }), quantity }] as any })} 
          containerStyle={{ flex: 1, minWidth: 100 }}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Label>CAMADA DO CURATIVO</Label>
        <Choices 
          options={['Primária', 'Secundária', 'Fixação']} 
          value={product?.layer ?? 'Primária'} 
          onChange={layer => onChange({ dressings: [{ ...(product ?? { id: uid(), product: '', start: new Date().toISOString() }), layer }] as any })} 
        />
      </View>

      <View style={{ gap: 6 }}>
        <Label>FREQUÊNCIA DE TROCA</Label>
        <Choices 
          options={frequencyOptions} 
          value={product?.frequency ?? ''} 
          onChange={frequency => onChange({ dressings: [{ ...(product ?? { id: uid(), product: '', layer: 'Primária', start: new Date().toISOString() }), frequency }] as any })} 
        />
      </View>
    </View>
  );
}

// ============================================================
// ETAPA 4: TERAPIAS COMPLEMENTARES
// ============================================================
function TherapiesStep({ local, onChange }: { local: Visit; onChange: (value: Partial<Visit>) => void }) {
  const therapy = local.therapies[0];

  const therapyTypes = [
    'Fotobiomodulação / Laser',
    'Ozonioterapia',
    'ILIB',
    'Desbridamento Instrumental',
    'Pressão Negativa',
    'Ultrassom Terapêutico'
  ];

  return (
    <View style={{ gap: 18 }}>
      <SectionTitle title="TERAPIA COMPLEMENTAR APLICADA" />
      <Choices 
        options={therapyTypes} 
        value={therapy?.type ?? ''} 
        onChange={type => onChange({ 
          therapies: [{ 
            id: therapy?.id ?? uid(), 
            type, 
            parameters: therapy?.parameters ?? {}, 
            duration: therapy?.duration ?? 0, 
            note: therapy?.note ?? '', 
            professional: 'Profissional autenticado', 
            date: new Date().toISOString() 
          }] 
        })} 
      />

      <Card style={{ padding: 18, gap: 12 }}>
        <Txt style={{ fontFamily: fonts.semibold, fontSize: 16 }}>
          {therapy?.type || 'Nenhuma terapia selecionada'}
        </Txt>
        <Field 
          label="Parâmetros Técnicos e Observações" 
          multiline 
          placeholder="Ex.: Laser Vermelho 660nm · 2 J/cm² pontual nas bordas e leito." 
          value={therapy?.note ?? ''} 
          onChangeText={note => therapy && onChange({ therapies: [{ ...therapy, note }] })} 
        />
      </Card>
    </View>
  );
}

// ============================================================
// ETAPA 5: FOTOGRAFIAS CLÍNICAS
// ============================================================
function PhotosStep({ 
  local, 
  onChange, 
  addPhoto,
  onRemovePhoto
}: { 
  local: Visit; 
  onChange: (value: Partial<Visit>) => void; 
  addPhoto: () => void;
  onRemovePhoto: (photoId: string) => void;
}) {
  const { colors } = useTheme();
  const handleRemove = (photoId: string) => {
    const doRemove = () => {
      onRemovePhoto(photoId);
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        if (window.confirm('Deseja realmente remover esta fotografia do atendimento?')) {
          doRemove();
        }
        return;
      }
    }

    Alert.alert(
      'Remover Foto',
      'Deseja realmente remover esta fotografia do atendimento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: doRemove }
      ]
    );
  };

  return (
    <View style={{ gap: 18 }}>
      <View style={s.between}>
        <SectionTitle title="REGISTRO FOTOGRÁFICO" />
        <Badge tone={local.photos.length ? 'green' : 'neutral'}>
          {local.photos.length} foto(s)
        </Badge>
      </View>

      <Button 
        title="Anexar Foto da Ferida" 
        icon={Plus} 
        variant="outline"
        onPress={addPhoto} 
      />

      {local.photos.map((photo, index) => (
        <Card key={photo.id} style={{ padding: 14, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Image source={{ uri: photo.uri }} style={{ width: 68, height: 68, borderRadius: 12 }} />
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Txt style={{ fontFamily: fonts.semibold, fontSize: 14 }} numberOfLines={1}>
                Foto {index + 1} · {photo.type || 'Leito da ferida'}
              </Txt>
              <Txt muted style={{ fontSize: 12 }}>
                {photo.rulerConfirmed ? 'Régua Calibrada' : 'Pendente de calibração'}
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Pressable onPress={() => onChange({ 
                  photos: local.photos.map(p => p.id === photo.id 
                    ? { ...p, rulerConfirmed: !p.rulerConfirmed, pixelsPerCm: p.rulerConfirmed ? undefined : 100 } 
                    : p
                  ) 
                })}>
                  <Txt style={{ color: colors.red, fontSize: 12, fontFamily: fonts.medium }}>
                    {photo.rulerConfirmed ? 'Desfazer régua' : 'Confirmar régua'}
                  </Txt>
                </Pressable>
                <Txt muted style={{ fontSize: 11 }}>•</Txt>
                <Pressable onPress={() => handleRemove(photo.id)}>
                  <Txt style={{ color: colors.red, fontSize: 12, fontFamily: fonts.medium }}>
                    Remover foto
                  </Txt>
                </Pressable>
              </View>
            </View>

            <IconButton 
              icon={Trash2} 
              label="Remover foto" 
              color={colors.red} 
              onPress={() => handleRemove(photo.id)} 
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.redSoft }} 
            />
          </View>

          <View style={{ gap: 6 }}>
            <Label>ENQUADRAMENTO</Label>
            <Choices 
              options={['Panorâmica', 'Aproximação', 'Leito da ferida', 'Pele perilesional']} 
              value={photo.type || 'Leito da ferida'} 
              onChange={selectedType => {
                onChange({
                  photos: local.photos.map(p => p.id === photo.id ? { ...p, type: selectedType } : p)
                });
              }} 
            />
          </View>
        </Card>
      ))}

      {!local.photos.length && (
        <Empty 
          icon={Camera} 
          title="Nenhuma foto anexada" 
          description="A fotografia permite acompanhamento visual longitudinal no prontuário." 
        />
      )}
    </View>
  );
}

// ============================================================
// ETAPA 6: CONDUTA, RETORNO E ASSINATURA DIGITAL
// ============================================================
function ConductStep({ 
  local, 
  patient, 
  wound, 
  onChange 
}: { 
  local: Visit; 
  patient: Patient; 
  wound: Wound; 
  onChange: (value: Partial<Visit>) => void;
}) {
  const returnPresets = [
    { label: '48 horas', days: 2 },
    { label: '7 dias', days: 7 },
    { label: '14 dias', days: 14 },
    { label: '21 dias', days: 21 },
    { label: '30 dias', days: 30 }
  ];

  return (
    <View style={{ gap: 18 }}>
      {/* Conduta Clínica */}
      <View style={{ gap: 10 }}>
        <SectionTitle title="CONDUTA E EVOLUÇÃO" />
        <Field 
          label="Conduta Clínica" 
          multiline 
          placeholder="Descreva a higienização realizada, desbridamento, coberturas fixadas e orientações." 
          value={local.plan} 
          onChangeText={plan => onChange({ plan })} 
        />
      </View>

      {/* Orientações ao Paciente */}
      <View style={{ gap: 10 }}>
        <SectionTitle title="ORIENTAÇÕES DE AUTOCUIDADO" />
        <Field 
          label="Orientações ao Paciente" 
          multiline 
          placeholder="Ex.: Não molhar o curativo secundário. Manter membros inferiores elevados." 
          value={local.guidance} 
          onChangeText={guidance => onChange({ guidance })} 
        />
      </View>

      {/* Data do Retorno com Opções Rápidas */}
      <View style={{ gap: 8 }}>
        <SectionTitle title="AGENDAMENTO DE RETORNO" />
        <Choices 
          options={returnPresets.map(p => p.label)} 
          value={
            returnPresets.find(p => format(addDays(new Date(), p.days), 'yyyy-MM-dd') === local.returnDate)?.label ?? ''
          } 
          onChange={val => {
            const preset = returnPresets.find(p => p.label === val);
            if (preset) {
              onChange({ returnDate: format(addDays(new Date(), preset.days), 'yyyy-MM-dd') });
            }
          }} 
        />

        <Field 
          label="Data do Retorno (AAAA-MM-DD)" 
          placeholder="AAAA-MM-DD" 
          value={local.returnDate} 
          onChangeText={returnDate => onChange({ returnDate })} 
        />
      </View>

      {/* Evolução no Modelo SOAP */}
      <SOAPEditor visit={local} patient={patient} wound={wound} />

      {/* Assinatura Digital em Card Padrão Minimalista */}
      <Card style={{ padding: 18, gap: 12 }}>
        <View style={s.between}>
          <View style={{ gap: 2 }}>
            <Label>ASSINATURA DIGITAL</Label>
            <Txt style={{ fontFamily: fonts.semibold, fontSize: 16 }}>
              {local.signature.length ? 'Assinatura Registrada' : 'Assinatura Pendente'}
            </Txt>
          </View>
          <Badge tone={local.signature.length ? 'green' : 'amber'}>
            {local.signature.length ? 'Confirmada' : 'Pendente'}
          </Badge>
        </View>

        <Txt muted style={{ fontSize: 12, lineHeight: 18 }}>
          {local.signature.length 
            ? `Assinado por ${local.signedBy || 'Caroline Ferreira (COREN 123456-SP)'}.` 
            : 'O atendimento será selado e registrado no prontuário eletrônico do paciente.'}
        </Txt>

        <Button 
          title={local.signature.length ? 'Assinatura Confirmada ✓' : 'Assinar Prontuário'} 
          variant={local.signature.length ? 'outline' : 'dark'} 
          icon={Check} 
          onPress={() => onChange({
            signature: [[{ x: 12, y: 22 }, { x: 34, y: 7 }, { x: 60, y: 25 }]],
            signedBy: 'Caroline Ferreira (COREN 123456-SP)'
          })} 
        />
      </Card>
    </View>
  );
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
