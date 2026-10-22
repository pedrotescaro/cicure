import React, { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Button, Field, IconButton, Txt } from './components';
import { fonts, useTheme } from './theme';
import { validCalendarDate } from '../domain/visit.lifecycle';

const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const dateIso = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
export const displayDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : value;

/** Complete dates use ISO storage. Incomplete typed values stay visible for validation, never silently reuse the last valid date. */
export function DateField({ label, value, onChange, error, placeholder = 'DD/MM/AAAA' }: { label: string; value: string; onChange: (value: string) => void; error?: string; placeholder?: string }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const initial = validCalendarDate(value) ? new Date(`${value}T12:00:00`) : new Date();
  const [month, setMonth] = useState(initial.getMonth());
  const [year, setYear] = useState(initial.getFullYear());
  const firstWeekday = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const navigate = (direction: number) => {
    const next = new Date(year, month + direction, 1);
    if (next.getFullYear() < 1900 || next.getFullYear() > 2200) return;
    setMonth(next.getMonth()); setYear(next.getFullYear());
  };
  return <View style={{ gap: 10 }}>
    <Field label={label} value={displayDate(value)} placeholder={placeholder} keyboardType="number-pad" maxLength={10}
      onBlur={() => setTouched(true)} error={error || (touched && value && !validCalendarDate(value) ? 'Informe uma data válida no formato DD/MM/AAAA.' : undefined)}
      onChangeText={text => {
        const digits = text.replace(/\D/g, '').slice(0, 8);
        const typed = digits.length > 4 ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}` : digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
        onChange(digits.length === 8 ? `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}` : typed);
      }} />
    <Button title={open ? 'Fechar calendário' : 'Escolher no calendário'} icon={CalendarDays} variant="outline" onPress={() => {
      if (!open && validCalendarDate(value)) { const selected = new Date(`${value}T12:00:00`); setMonth(selected.getMonth()); setYear(selected.getFullYear()); }
      setOpen(!open);
    }} />
    {open && <View style={{ gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 12, backgroundColor: colors.surface }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon={ChevronLeft} label="Mês anterior" onPress={() => navigate(-1)} />
        <Txt accessibilityLiveRegion="polite" style={{ fontFamily: fonts.semibold, flex: 1, textAlign: 'center' }}>{months[month]} de {year}</Txt>
        <IconButton icon={ChevronRight} label="Próximo mês" onPress={() => navigate(1)} />
      </View>
      <ScrollView horizontal><View style={{ minWidth: 336, flex: 1 }}>
      <View style={{ flexDirection: 'row' }}>{['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => <Txt key={index} style={{ width: `${100 / 7}%`, textAlign: 'center', fontSize: 14 }} muted>{day}</Txt>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {Array.from({ length: firstWeekday + days }, (_, index) => {
          const day = index - firstWeekday + 1;
          if (day < 1) return <View key={`blank-${index}`} style={{ width: `${100 / 7}%`, minHeight: 48 }} />;
          const iso = dateIso(year, month, day);
          const selected = value === iso;
          return <Pressable key={iso} accessibilityRole="button" accessibilityLabel={`${day} de ${months[month]} de ${year}`} accessibilityState={{ selected }}
            onPress={() => { onChange(iso); setTouched(false); setOpen(false); }}
            style={{ width: `${100 / 7}%`, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: selected ? colors.red : 'transparent' }}>
            <Txt style={{ color: selected ? '#FFF' : colors.text, fontFamily: selected ? fonts.semibold : fonts.regular }}>{day}</Txt>
          </Pressable>;
        })}
      </View>
      </View></ScrollView>
      <Txt muted style={{ fontSize: 14, lineHeight: 20 }}>Para outra data, você também pode digitar dia, mês e ano no campo acima.</Txt>
    </View>}
  </View>;
}
