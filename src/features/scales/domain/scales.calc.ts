import { area, decimal, volume, change, evolution } from '../../../domain/clinical';

export { area, decimal, volume, change, evolution };

/**
 * Calcula a velocidade de cicatrização (cm²/semana) entre duas visitas.
 */
export function healingVelocity(
  initialArea: number,
  currentArea: number,
  daysBetween: number
): { cm2PerWeek: number; percentReduction: number } {
  if (daysBetween <= 0 || initialArea <= 0) {
    return { cm2PerWeek: 0, percentReduction: 0 };
  }

  const reduction = initialArea - currentArea;
  const cm2PerWeek = (reduction / daysBetween) * 7;
  const percentReduction = (reduction / initialArea) * 100;

  return { cm2PerWeek, percentReduction };
}

/**
 * Estima as semanas restantes para o fechamento completo da lesão
 * com base na velocidade média de cicatrização semanal.
 */
export function estimateWeeksToHeal(
  currentArea: number,
  cm2PerWeek: number
): number | null {
  if (currentArea <= 0) return 0;
  if (cm2PerWeek <= 0) return null; // Lesão estagnada ou piorando
  return Math.round((currentArea / cm2PerWeek) * 10) / 10;
}
