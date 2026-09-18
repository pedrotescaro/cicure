import { differenceInYears, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { z } from 'zod';
import type { Point, Visit } from './types';

export const decimal = (value: string | number) => Number(String(value).replace(',', '.'));
export const number = (value: number, digits = 1) => value.toLocaleString('pt-BR', { maximumFractionDigits: digits });
export const dateLabel = (value: string, pattern = 'dd/MM/yyyy') => value ? format(parseISO(value), pattern, { locale: ptBR }) : 'Não informado';
export const age = (birthDate: string) => birthDate ? differenceInYears(new Date(), parseISO(birthDate)) : 0;
export const area = (visit: Pick<Visit, 'length' | 'width'>) => decimal(visit.length) * decimal(visit.width);
export const volume = (visit: Pick<Visit, 'length' | 'width' | 'depth'>) => area(visit) * decimal(visit.depth);
export function change(current: number, previous: number) { return { absolute: current - previous, percent: previous > 0 ? (current - previous) / previous * 100 : null }; }
export function stagnant(visits: Visit[]) { const values = visits.filter(v => v.state === 'Concluído' && v.length && v.width).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).map(area); return values.length === 4 && values.slice(0, 3).every((v, i) => v >= values[i + 1]); }
export function polygonArea(points: Point[], pixelsPerCm: number) { if (points.length < 3 || !Number.isFinite(pixelsPerCm) || pixelsPerCm <= 0) return null; return Math.abs(points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p.x * q.y - q.x * p.y; }, 0)) / 2 / (pixelsPerCm ** 2); }
export function evolution(a: Visit, b: Visit) { const days = (Date.parse(b.date) - Date.parse(a.date)) / 86400000; const reduction = area(a) - area(b); const weekly = days > 0 ? reduction / days * 7 : null; return { reduction, percent: area(a) > 0 ? reduction / area(a) * 100 : null, weekly, weeksRemaining: weekly && weekly > 0 ? area(b) / weekly : null }; }
const dimension = z.string().refine(v => v === '' || (Number.isFinite(decimal(v)) && decimal(v) >= 0 && decimal(v) <= 200), 'Informe de 0 a 200 cm');
export const measurementSchema = z.object({ length: dimension, width: dimension, depth: dimension });
export function visitErrors(visit: Visit) {
  const errors: string[] = [];
  if (!measurementSchema.safeParse(visit).success) errors.push('Revise as medidas: use números de 0 a 200 cm.');
  if (!(decimal(visit.length) > 0 && decimal(visit.width) > 0) && !visit.photos.length) errors.push('Registre comprimento e largura ou adicione uma foto.');
  if (visit.photos.some(p => !p.rulerConfirmed && !(p.pixelsPerCm && p.pixelsPerCm > 0))) errors.push('Confirme a régua ou calibre todas as fotos.');
  const total = Object.values(visit.tissue).reduce((a, b) => a + b, 0);
  if (total !== 100) errors.push('Os tecidos do leito devem somar 100%.');
  if (visit.returnDate && (!/^\d{4}-\d{2}-\d{2}$/.test(visit.returnDate) || !Number.isFinite(Date.parse(visit.returnDate)) || visit.returnDate < visit.date.slice(0, 10))) errors.push('Informe um retorno válido posterior ao atendimento (AAAA-MM-DD).');
  if (!visit.signature.some(p => p.length > 2)) errors.push('Assine o atendimento antes de concluir.');
  return errors;
}
export const etiologies = ['Venosa', 'Arterial', 'Mista', 'Pé diabético', 'Pressão', 'Traumática', 'Cirúrgica deiscente', 'Oncológica', 'Queimadura', 'Outra'];
export const comorbidities = ['Diabetes mellitus tipo 1', 'Diabetes mellitus tipo 2', 'Hipertensão arterial sistêmica', 'Insuficiência venosa crônica', 'Doença arterial periférica', 'Insuficiência cardíaca', 'Insuficiência renal crônica', 'Dislipidemia', 'Obesidade', 'Neuropatia periférica', 'Artrite reumatoide', 'Lúpus', 'Anemia falciforme', 'Imunossupressão', 'Neoplasia'];
export const productNames = ['Alginato de cálcio', 'Hidrofibra com prata', 'Hidrocoloide', 'Hidrogel', 'Espuma de poliuretano', 'Carvão ativado', 'Colagenase', 'Papaína', 'PHMB', 'Ácidos graxos essenciais', 'Sulfadiazina de prata', 'Matriz de colágeno', 'Membrana de celulose', 'Curativo de pressão negativa', 'Bota de Unna', 'Terapia compressiva'];
export const tissueNames = ['Granulação', 'Epitelização', 'Esfacelo', 'Necrose seca', 'Necrose úmida', 'Hipergranulação'];
export const therapyFields: Record<string, string[]> = {
  'Fotobiomodulação': ['Comprimento de onda (nm)', 'Potência (mW)', 'Energia por ponto (J)', 'Número de pontos', 'Densidade de energia (J/cm²)', 'Modo: pontual/varredura', 'Tempo por ponto (s)', 'Aplicação: perilesional/leito/ambos'],
  'Ozonioterapia': ['Via', 'Concentração (µg/mL)', 'Volume (mL)', 'Tempo de exposição (min)'],
  'ILIB': ['Comprimento de onda (nm)', 'Potência (mW)', 'Tempo de sessão (min)', 'Local de aplicação'],
  'PRF / i-PRF': ['Volume coletado (mL)', 'Rotação (rpm)', 'Centrifugação (min)', 'Forma de aplicação', 'Número de tubos'],
  'Ultrassom terapêutico': ['Frequência (MHz)', 'Intensidade (W/cm²)', 'Modo', 'Tempo (min)'],
  'Microcorrentes': ['Intensidade (µA)', 'Frequência (Hz)', 'Tempo (min)'],
  'Pressão negativa': ['Pressão (mmHg)', 'Modo', 'Tempo (min)'],
  'Larvoterapia': ['Produto', 'Quantidade', 'Tempo de aplicação'],
  'Desbridamento': ['Tipo: instrumental/enzimático/autolítico/mecânico', 'Área tratada', 'Observação'],
};
