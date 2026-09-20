import { SCALES_REGISTRY } from '../domain/scales.registry';
import { healingVelocity, estimateWeeksToHeal } from '../domain/scales.calc';
import { area, volume, change } from '../../../domain/clinical';

// Self-contained test runner helpers for execution without global Jest injection
function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runClinicalAlgorithmTests(): { passed: number; failed: number; results: string[] } {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      passed++;
      results.push(`PASS: ${name}`);
    } catch (err: any) {
      failed++;
      results.push(`FAIL: ${name}: ${err.message}`);
    }
  }

  // 1. Validação da Escala WIfI
  test('WIfI: Lesão superficial sem isquemia e sem infecção deve gerar Estágio 0 ou 1', () => {
    const wifi = SCALES_REGISTRY.WIfI;
    const res = wifi.calculate({ wound: 1, ischemia: 0, footInfection: 0 });
    assert(res.score <= 1, `Score esperado <= 1, obtido: ${res.score}`);
  });

  test('WIfI: Isquemia crítica (grau 3) e infecção moderada deve gerar Estágio 3 ou 4 (alto risco)', () => {
    const wifi = SCALES_REGISTRY.WIfI;
    const res = wifi.calculate({ wound: 2, ischemia: 3, footInfection: 2 });
    assert(res.score >= 3, `Score esperado >= 3, obtido: ${res.score}`);
    assert(res.interpretation.includes('amputação'), 'Deveria mencionar risco de amputação');
  });

  // 2. Validação da Escala Braden
  test('Braden: Pontuação máxima (23) deve indicar ausência de risco', () => {
    const braden = SCALES_REGISTRY.Braden;
    const res = braden.calculate({ sensory: 4, moisture: 4, activity: 4, mobility: 4, nutrition: 4, friction: 3 });
    assert(res.score === 23, `Score esperado 23, obtido: ${res.score}`);
    assert(res.interpretation.includes('Sem risco'), 'Interpretação incorreta');
  });

  test('Braden: Pontuação grave (6) deve indicar risco gravíssimo', () => {
    const braden = SCALES_REGISTRY.Braden;
    const res = braden.calculate({ sensory: 1, moisture: 1, activity: 1, mobility: 1, nutrition: 1, friction: 1 });
    assert(res.score === 6, `Score esperado 6, obtido: ${res.score}`);
    assert(res.interpretation.includes('Risco Gravíssimo'), 'Interpretação incorreta');
  });

  // 3. Cálculos de Área e Volume
  test('Área e Volume: deve calcular medidas retangulares e cúbicas com precisão', () => {
    const calcArea = area({ length: '5.0', width: '3.0' });
    assert(calcArea === 15.0, `Área esperada 15, obtida: ${calcArea}`);

    const calcVol = volume({ length: '4.0', width: '2.5', depth: '0.5' });
    assert(calcVol === 5.0, `Volume esperado 5, obtido: ${calcVol}`);

    const diff = change(6.0, 10.0);
    assert(diff.percent === -40.0, `Redução esperada -40%, obtida: ${diff.percent}`);
  });

  // 4. Velocidade de Cicatrização
  test('Velocidade de Cicatrização: taxa semanal e semanas estimadas para fechamento', () => {
    const vel = healingVelocity(10, 6, 14);
    assert(vel.cm2PerWeek === 2, `Velocidade esperada 2 cm²/semana, obtida: ${vel.cm2PerWeek}`);
    assert(vel.percentReduction === 40, `Redução esperada 40%, obtida: ${vel.percentReduction}`);

    const weeks = estimateWeeksToHeal(6, vel.cm2PerWeek);
    assert(weeks === 3, `Semanas restantes esperadas 3, obtidas: ${weeks}`);
  });

  return { passed, failed, results };
}
