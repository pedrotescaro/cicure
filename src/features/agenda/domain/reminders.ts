import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Visit } from '../../../domain/types';

export function appointmentDate(visit: Pick<Visit, 'date' | 'scheduledTime'>): Date | null {
  const day = visit.date.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(visit.scheduledTime)) return null;
  const date = new Date(`${day}T${visit.scheduledTime}:00`);
  const [year, month, monthDay] = day.split('-').map(Number);
  return Number.isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== monthDay ? null : date;
}

// Use a stable, account-specific identifier so editing an appointment replaces its reminder.
export async function updateAppointmentReminder(scope: string, visit: Visit): Promise<Visit> {
  if (Platform.OS === 'web') return { ...visit, reminderStatus: 'unsupported', reminderId: undefined };
  const id = `cicure:${scope}:${visit.id}`;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
    if (visit.reminderId && visit.reminderId !== id) await Notifications.cancelScheduledNotificationAsync(visit.reminderId);
    const isReturn = visit.state === 'Concluído' && Boolean(visit.returnDate);
    const date = appointmentDate(isReturn ? { date: visit.returnDate, scheduledTime: visit.returnTime || '09:00' } : visit);
    if ((!isReturn && visit.state !== 'Agendado') || visit.deletedAt || !date || date.getTime() <= Date.now()) return { ...visit, reminderStatus: 'none', reminderId: undefined };
    if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('retornos', { name: 'Agenda e retornos', importance: Notifications.AndroidImportance.DEFAULT });
    const current = await Notifications.getPermissionsAsync();
    const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
    if (!permission.granted) return { ...visit, reminderStatus: 'denied', reminderId: undefined };
    const reminderId = await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title: 'Você tem um atendimento', body: 'Abra a Agenda do Cicure para consultar os detalhes.', data: { visitId: visit.id, scope } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: 'retornos' },
    });
    return { ...visit, reminderId, reminderStatus: 'scheduled' };
  } catch {
    return { ...visit, reminderStatus: 'error', reminderId: undefined };
  }
}

export async function cancelAccountReminders(scope: string) {
  if (Platform.OS === 'web') return;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter(item => item.content.data?.scope === scope).map(item => Notifications.cancelScheduledNotificationAsync(item.identifier)));
}
