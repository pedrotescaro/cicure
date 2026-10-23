import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import type { Report } from '../../../domain/types';
import { reportHtml } from './report';
type ReportAccessGuard = () => void;
export async function createReportPdf(report: Report, scope: string, assertAccess: ReportAccessGuard): Promise<string> {
  assertAccess();
  if (Platform.OS === 'web') throw new Error('Gere o arquivo PDF pelo aplicativo Android.');
  if (!FileSystem.documentDirectory || !/^user:[a-zA-Z0-9-]+(?::org:[a-zA-Z0-9-]+)?$/.test(scope)) throw new Error('Armazenamento da sua conta indisponível. Entre novamente.');
  const html = reportHtml(report);
  assertAccess();
  const { uri } = await Print.printToFileAsync({ html });
  assertAccess();
  const directory = `${FileSystem.documentDirectory}clinical/${scope.replace(/:/g, '-')}/reports/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  assertAccess();
  const target = `${directory}cicure-${report.id}.pdf`;
  await FileSystem.copyAsync({ from: uri, to: target });
  const info = await FileSystem.getInfoAsync(target);
  assertAccess();
  if (!info.exists || !info.size) throw new Error('O PDF não foi gerado. Tente novamente.');
  return target;
}
export async function previewReport(report: Report, assertAccess: ReportAccessGuard) {
  assertAccess();
  const html = reportHtml(report);
  assertAccess();
  await Print.printAsync({ html });
}
export async function shareReport(report: Report, scope: string, assertAccess: ReportAccessGuard) {
  assertAccess();
  const expected = FileSystem.documentDirectory && `${FileSystem.documentDirectory}clinical/${scope.replace(/:/g, '-')}/reports/cicure-${report.id}.pdf`;
  if (!expected || report.uri !== expected || !(await FileSystem.getInfoAsync(expected)).exists) throw new Error('Gere o PDF neste aparelho e nesta conta antes de compartilhar.');
  if (!(await Sharing.isAvailableAsync())) throw new Error('O compartilhamento não está disponível neste aparelho.');
  assertAccess();
  await Sharing.shareAsync(report.uri, { mimeType: 'application/pdf', dialogTitle: 'Compartilhar relatório confidencial', UTI: 'com.adobe.pdf' });
}
