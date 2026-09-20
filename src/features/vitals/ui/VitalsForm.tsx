import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Activity, Heart, Thermometer } from 'lucide-react-native';
import { Accordion, Badge, Field, Label, Txt, s } from '../../../ui/components';
import { colors as c, fonts } from '../../../ui/theme';
import type { VitalSigns } from '../domain/types';

export default function VitalsForm({
  vitals,
  onChange
}: {
  vitals?: VitalSigns;
  onChange: (data: Partial<VitalSigns>) => void;
}) {
  const [pas, setPas] = useState(vitals?.bloodPressureSys || '');
  const [pad, setPad] = useState(vitals?.bloodPressureDia || '');
  const [fc, setFc] = useState(vitals?.heartRate || '');
  const [fr, setFr] = useState(vitals?.respiratoryRate || '');
  const [temp, setTemp] = useState(vitals?.temperature || '');
  const [spo2, setSpo2] = useState(vitals?.spo2 || '');
  const [glicemia, setGlicemia] = useState(vitals?.capillaryGlucose || '');
  const [peso, setPeso] = useState(vitals?.weight || '');

  const update = (key: keyof VitalSigns, value: string) => {
    onChange({ [key]: value });
  };

  const summary = [
    pas && pad ? `PA ${pas}/${pad}` : null,
    fc ? `FC ${fc} bpm` : null,
    spo2 ? `SpO₂ ${spo2}%` : null,
    glicemia ? `Glicemia ${glicemia} mg/dL` : null
  ].filter(Boolean).join(' · ');

  return (
    <Accordion 
      title="Sinais Vitais (Opcionais)" 
      subtitle={summary || 'PA, FC, Temperatura, Glicemia, SpO₂'}
      initialOpen={false}
    >
      <View style={styles.grid}>
        <Field 
          label="PA Sistólica (mmHg)" 
          keyboardType="numeric" 
          placeholder="Ex.: 120" 
          value={pas} 
          onChangeText={v => { setPas(v); update('bloodPressureSys', v); }} 
        />
        <Field 
          label="PA Diastólica (mmHg)" 
          keyboardType="numeric" 
          placeholder="Ex.: 80" 
          value={pad} 
          onChangeText={v => { setPad(v); update('bloodPressureDia', v); }} 
        />
        <Field 
          label="Frequência Cardíaca (bpm)" 
          keyboardType="numeric" 
          placeholder="Ex.: 72" 
          value={fc} 
          onChangeText={v => { setFc(v); update('heartRate', v); }} 
        />
        <Field 
          label="Frequência Respiratória (irpm)" 
          keyboardType="numeric" 
          placeholder="Ex.: 16" 
          value={fr} 
          onChangeText={v => { setFr(v); update('respiratoryRate', v); }} 
        />
        <Field 
          label="Temperatura Axilar (°C)" 
          keyboardType="decimal-pad" 
          placeholder="Ex.: 36.5" 
          value={temp} 
          onChangeText={v => { setTemp(v); update('temperature', v); }} 
        />
        <Field 
          label="Saturação SpO₂ (%)" 
          keyboardType="numeric" 
          placeholder="Ex.: 98" 
          value={spo2} 
          onChangeText={v => { setSpo2(v); update('spo2', v); }} 
        />
        <Field 
          label="Glicemia Capilar (mg/dL)" 
          keyboardType="numeric" 
          placeholder="Ex.: 110" 
          value={glicemia} 
          onChangeText={v => { setGlicemia(v); update('capillaryGlucose', v); }} 
        />
        <Field 
          label="Peso Atual (kg)" 
          keyboardType="decimal-pad" 
          placeholder="Ex.: 74.5" 
          value={peso} 
          onChangeText={v => { setPeso(v); update('weight', v); }} 
        />
      </View>
    </Accordion>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  }
});
