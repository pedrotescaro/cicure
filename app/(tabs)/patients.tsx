import { CicureWordmark } from '../../src/ui/brand/CicureWordmark';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ChevronRight, UserRoundPlus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Avatar, Badge, Button, Card, Empty, Field, Pills, Txt, s } from '../../src/ui/components';
import { fonts, useTheme } from '../../src/ui/theme';
import { useStore } from '../../src/data/store';
import { age, dateLabel } from '../../src/domain/clinical';
import { useTabContentInset } from '../../src/ui/navigation/useTabContentInset';
import { PatientForm } from '../../src/features/patients/ui/PatientForm';
import { normalizedPatientSearch } from '../../src/features/patients/domain/patient-form';

export default function Patients() {
  const router = useRouter();
  const { colors: c } = useTheme();
  const bottomInset = useTabContentInset();
  const { patients, wounds, visits } = useStore(state => state.data);
  const presentation = useStore(state => state.presentation);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [adding, setAdding] = useState(false);
  const filtered = useMemo(() => patients.filter(patient => {
    const matchesStatus = filter === 'Todos' || patient.status === ({ Ativos: 'Ativo', Alta: 'Alta', Arquivados: 'Arquivado' } as Record<string, string>)[filter];
    const search = normalizedPatientSearch(query);
    return matchesStatus && (!search || normalizedPatientSearch(`${patient.name} ${patient.cpf} ${patient.phone}`).includes(search) || (query.replace(/\D/g, '').length >= 3 && `${patient.cpf}${patient.phone}`.replace(/\D/g, '').includes(query.replace(/\D/g, ''))));
  }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [patients, query, filter]);
  return <View style={{ flex: 1, backgroundColor: c.bg }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: bottomInset, gap: 20 }}>
      <CicureWordmark size={32} />
      <Txt accessibilityRole="header" style={s.h1}>Pacientes</Txt>
      <Txt muted>Encontre o paciente para consultar suas feridas, registrar um atendimento ou atualizar o cadastro.</Txt>
      {!presentation && <Button title="Novo paciente" icon={UserRoundPlus} onPress={() => setAdding(true)} />}
      <Field label="Buscar paciente" placeholder="Nome, CPF ou telefone" value={query} onChangeText={setQuery} autoCorrect={false} />
      <Pills options={['Todos', 'Ativos', 'Alta', 'Arquivados']} value={filter} onChange={setFilter} />
      <Txt muted accessibilityLiveRegion="polite">{filtered.length} {filtered.length === 1 ? 'paciente encontrado' : 'pacientes encontrados'}</Txt>
      {filtered.map(patient => {
        const patientWounds = wounds.filter(wound => wound.patientId === patient.id);
        const latest = visits.filter(visit => visit.patientId === patient.id).sort((a, b) => b.date.localeCompare(a.date))[0];
        return <Pressable key={patient.id} accessibilityRole="button" accessibilityLabel={presentation ? 'Paciente com identificação oculta' : `Abrir prontuário de ${patient.name}`} onPress={() => router.push(`/patient/${patient.id}`)}>
          <Card style={{ gap: 14 }}>
            <View style={s.row}>
              <Avatar name={patient.name} color={patient.color} anonymous={presentation} />
              <View style={{ flex: 1, gap: 5 }}>
                <Txt style={{ fontFamily: fonts.semibold, fontSize: 18 }}>{presentation ? 'Paciente em apresentação' : patient.name}</Txt>
                <Txt muted>{presentation ? 'Identificação oculta' : `${patient.birthDate ? `${age(patient.birthDate)} anos · ` : ''}${patient.status}`}</Txt>
              </View>
              <ChevronRight color={c.secondary} size={22} />
            </View>
            <View style={[s.row, { flexWrap: 'wrap' }]}><Badge>{patientWounds.length} {patientWounds.length === 1 ? 'ferida' : 'feridas'}</Badge><Txt muted style={{ flexShrink: 1 }}>{presentation ? 'Dados clínicos ocultos' : patientWounds.map(wound => wound.location).join(' · ') || 'Cadastre a primeira ferida no prontuário'}</Txt></View>
            <Txt muted>{latest ? `Último registro: ${dateLabel(latest.date)} · ${latest.state}` : 'Sem atendimento registrado'}</Txt>
          </Card>
        </Pressable>;
      })}
      {!filtered.length && <Empty title={patients.length ? 'Nenhum paciente nesta busca' : 'Seu primeiro paciente começa aqui'} description={patients.length ? 'Confira o nome, CPF ou telefone, ou escolha outro filtro.' : 'Cadastre o paciente e depois adicione cada ferida ao prontuário.'} action={presentation ? undefined : patients.length ? 'Limpar busca e filtros' : 'Novo paciente'} onPress={patients.length ? () => { setQuery(''); setFilter('Todos'); } : () => setAdding(true)} />}
    </ScrollView>
    {adding && <PatientForm onClose={() => setAdding(false)} onSaved={patient => { setAdding(false); router.push(`/patient/${patient.id}`); }} />}
  </View>;
}
