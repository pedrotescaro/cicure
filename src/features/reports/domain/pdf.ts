import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import type { Report } from '../../../domain/types';
import { reportHtml } from './report';
export async function createReportPdf(report: Report, scope: string): Promise<string> {
  if (Platform.OS === 'web') throw new Error('Gere o arquivo PDF pelo aplicativo Android.');
  if (!FileSystem.documentDirectory || !/^user:[a-zA-Z0-9-]+(?::org:[a-zA-Z0-9-]+)?$/.test(scope)) throw new Error('Armazenamento da sua conta indisponível. Entre novamente.');
  const { uri } = await Print.printToFileAsync({ html: reportHtml(report) });
  const directory = `${FileSystem.documentDirectory}clinical/${scope.replace(/:/g, '-')}/reports/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const target = `${directory}cicure-${report.id}.pdf`;
  await FileSystem.copyAsync({ from: uri, to: target });
  const info = await FileSystem.getInfoAsync(target);
  if (!info.exists || !info.size) throw new Error('O PDF não foi gerado. Tente novamente.');
  return target;
}
export async function previewReport(report: Report) { await Print.printAsync({ html: reportHtml(report) }); }
export async function shareReport(report: Report) {
  if (!report.uri || !(await FileSystem.getInfoAsync(report.uri)).exists) throw new Error('Gere o PDF neste aparelho antes de compartilhar.');
  if (!(await Sharing.isAvailableAsync())) throw new Error('O compartilhamento não está disponível neste aparelho.');
  await Sharing.shareAsync(report.uri, { mimeType: 'application/pdf', dialogTitle: 'Compartilhar relatório confidencial', UTI: 'com.adobe.pdf' });
}
