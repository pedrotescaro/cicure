import { runClinicalAlgorithmTests } from '../src/features/scales/__tests__/scales.test';

const result = runClinicalAlgorithmTests();
for (const line of result.results) console.log(line);
console.log(`${result.passed} passed, ${result.failed} failed`);
if (result.failed > 0 || result.passed === 0) process.exitCode = 1;
