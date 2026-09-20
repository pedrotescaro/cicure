import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Accordion, Choices, Field, Label, Txt, s } from '../../../ui/components';
import { colors as c, fonts } from '../../../ui/theme';
import type { VascularAssessment } from '../domain/types';

export default function VascularAssessmentForm({
  assessment,
  onChange
}: {
  assessment?: Partial<VascularAssessment>;
  onChange: (data: Partial<VascularAssessment>) => void;
}) {
  const [pediosoD, setPediosoD] = useState(assessment?.peripheralPulses?.pediosoDireito || 'Presente');
  const [pediosoE, setPediosoE] = useState(assessment?.peripheralPulses?.pediosoEsquerdo || 'Presente');
  const [tibialD, setTibialD] = useState(assessment?.peripheralPulses?.tibialPosteriorDireito || 'Presente');
  const [tibialE, setTibialE] = useState(assessment?.peripheralPulses?.tibialPosteriorEsquerdo || 'Presente');
  
  const [perfusion, setPerfusion] = useState(assessment?.perfusion || 'Adequada');
  const [capRefill, setCapRefill] = useState(assessment?.capillaryRefill || '< 3 segundos');
  const [edema, setEdema] = useState(assessment?.edema || 'Ausente');
  const [temp, setTemp] = useState(assessment?.limbTemperature || 'Normotérmico');
  const [sensitivity, setSensitivity] = useState(assessment?.sensitivity || 'Preservada');
  const [monofilament, setMonofilament] = useState(assessment?.monofilamentTest || 'Sem perda protetora');
  const [obs, setObs] = useState('');

  const sync = () => {
    onChange({
      peripheralPulses: {
        pediosoDireito: pediosoD,
        pediosoEsquerdo: pediosoE,
        tibialPosteriorDireito: tibialD,
        tibialPosteriorEsquerdo: tibialE,
      },
      perfusion,
      capillaryRefill: capRefill,
      edema,
      limbTemperature: temp,
      sensitivity,
      monofilamentTest: monofilament,
      customFields: obs ? { observacaoNeurologica: obs } : undefined,
      recordedAt: new Date().toISOString(),
      recordedBy: 'Profissional autenticado'
    });
  };

  return (
    <Accordion 
      title="Avaliação Vascular e Neurológica" 
      subtitle="Pulsos, perfusão, enchimento, edema, monofilamento"
      initialOpen={false}
    >
      <View style={{ gap: 14 }}>
        {/* Pulsos */}
        <View style={{ gap: 6 }}>
          <Label>Pulso Pedioso Direito</Label>
          <Choices 
            options={['Presente', 'Diminuído', 'Ausente']} 
            value={pediosoD} 
            onChange={v => { setPediosoD(v); sync(); }} 
          />
        </View>

        <View style={{ gap: 6 }}>
          <Label>Pulso Pedioso Esquerdo</Label>
          <Choices 
            options={['Presente', 'Diminuído', 'Ausente']} 
            value={pediosoE} 
            onChange={v => { setPediosoE(v); sync(); }} 
          />
        </View>

        <View style={{ gap: 6 }}>
          <Label>Pulso Tibial Posterior Direito</Label>
          <Choices 
            options={['Presente', 'Diminuído', 'Ausente']} 
            value={tibialD} 
            onChange={v => { setTibialD(v); sync(); }} 
          />
        </View>

        <View style={{ gap: 6 }}>
          <Label>Pulso Tibial Posterior Esquerdo</Label>
          <Choices 
            options={['Presente', 'Diminuído', 'Ausente']} 
            value={tibialE} 
            onChange={v => { setTibialE(v); sync(); }} 
          />
        </View>

        {/* Perfusão e Enchimento Capilar */}
        <View style={{ gap: 6 }}>
          <Label>Perfusão Periférica</Label>
          <Choices 
            options={['Adequada', 'Lenta (>3s)', 'Crítica']} 
            value={perfusion} 
            onChange={v => { setPerfusion(v); sync(); }} 
          />
        </View>

        <View style={{ gap: 6 }}>
          <Label>Tempo de Enchimento Capilar</Label>
          <Choices 
            options={['< 3 segundos', '3 a 5 segundos', '> 5 segundos']} 
            value={capRefill} 
            onChange={v => { setCapRefill(v); sync(); }} 
          />
        </View>

        {/* Edema */}
        <View style={{ gap: 6 }}>
          <Label>Edema em Membros Inferiores</Label>
          <Choices 
            options={['Ausente', '1+/4+', '2+/4+', '3+/4+', '4+/4+']} 
            value={edema} 
            onChange={v => { setEdema(v); sync(); }} 
          />
        </View>

        {/* Temperatura do Membro */}
        <View style={{ gap: 6 }}>
          <Label>Temperatura Térmica Local</Label>
          <Choices 
            options={['Normotérmico', 'Frio / Isquêmico', 'Aquecido / Inflamatório']} 
            value={temp} 
            onChange={v => { setTemp(v); sync(); }} 
          />
        </View>

        {/* Sensibilidade Tátil e Teste do Monofilamento */}
        <View style={{ gap: 6 }}>
          <Label>Sensibilidade Tátil</Label>
          <Choices 
            options={['Preservada', 'Diminuída', 'Ausente']} 
            value={sensitivity} 
            onChange={v => { setSensitivity(v); sync(); }} 
          />
        </View>

        <View style={{ gap: 6 }}>
          <Label>Teste do Monofilamento 10g (Semmes-Weinstein)</Label>
          <Choices 
            options={['Sem perda protetora', 'Perda de sensibilidade protetora']} 
            value={monofilament} 
            onChange={v => { setMonofilament(v); sync(); }} 
          />
        </View>

        <Field 
          label="Observações Adicionais da Avaliação Vascular" 
          value={obs} 
          onChangeText={v => { setObs(v); sync(); }} 
          placeholder="Ex.: Palidez à elevação do membro, rubor pendular..." 
        />
      </View>
    </Accordion>
  );
}
