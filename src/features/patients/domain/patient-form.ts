import type { Patient } from '../../../domain/types';

export type PatientFormValues = Pick<Patient, 'name' | 'birthDate' | 'sex' | 'cpf' | 'sus' | 'phone' | 'address' | 'emergency' | 'status'> & { allergies: string; comorbidities: string };

export function patientFormValues(patient?: Patient): PatientFormValues {
  return {
    name: patient?.name ?? '', birthDate: patient?.birthDate ?? '', sex: patient?.sex ?? 'Não informado',
    cpf: patient?.cpf ?? '', sus: patient?.sus ?? '', phone: patient?.phone ?? '', address: patient?.address ?? '',
    emergency: patient?.emergency ?? '', status: patient?.status ?? 'Ativo',
    allergies: patient?.allergies.join(', ') ?? '', comorbidities: patient?.comorbidities.map(item => item.name).join(', ') ?? '',
  };
}

export function validCpf(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  return [9, 10].every(length => {
    const sum = digits.slice(0, length).split('').reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const check = (sum * 10) % 11;
    return Number(digits[length]) === (check === 10 ? 0 : check);
  });
}

export function patientFormErrors(values: PatientFormValues, today = new Date()) {
  const errors: Partial<Record<keyof PatientFormValues, string>> = {};
  if (values.name.replace(/[^\p{L}]/gu, '').length < 3) errors.name = 'Informe o nome com pelo menos 3 letras.';
  if (values.birthDate) {
    const date = new Date(`${values.birthDate}T12:00:00`);
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.birthDate) || !Number.isFinite(date.getTime()) || date.getFullYear() < 1900 || date.getFullYear() !== Number(values.birthDate.slice(0, 4)) || date.getMonth() + 1 !== Number(values.birthDate.slice(5, 7)) || date.getDate() !== Number(values.birthDate.slice(8, 10)) || date > endOfToday) errors.birthDate = 'Selecione uma data de nascimento válida, até hoje.';
  }
  if (values.cpf.trim() && !validCpf(values.cpf)) errors.cpf = 'Confira os 11 dígitos do CPF.';
  if (values.sus.trim() && values.sus.replace(/\D/g, '').length !== 15) errors.sus = 'Informe os 15 dígitos do Cartão SUS.';
  if (values.phone.trim() && ![10, 11].includes(values.phone.replace(/\D/g, '').length)) errors.phone = 'Informe o telefone com DDD, com 10 ou 11 dígitos.';
  return errors;
}

export function buildPatient(values: PatientFormValues, id: string, previous?: Patient): Patient {
  const names = values.comorbidities.split(',').map(name => name.trim()).filter(Boolean);
  return {
    ...(previous ?? { id, weight: 0, height: 0, bloodType: '', smoking: '', alcohol: '', activity: '', medications: [], exams: [], color: '#FAD2D2', createdAt: new Date().toISOString() }),
    ...values, id, name: values.name.trim(), cpf: values.cpf.replace(/\D/g, ''), sus: values.sus.replace(/\D/g, ''),
    phone: values.phone.trim(), address: values.address.trim(), emergency: values.emergency.trim(),
    allergies: values.allergies.split(',').map(item => item.trim()).filter(Boolean),
    comorbidities: names.map(name => previous?.comorbidities.find(item => item.name === name) ?? { name, date: '', note: '' }),
  };
}

export function normalizedPatientSearch(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim(); }
