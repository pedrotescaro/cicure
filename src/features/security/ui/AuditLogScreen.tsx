import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Shield, Eye, Edit3, CheckCircle, Share2, Download, LogIn } from 'lucide-react-native';
import { Badge, Card, Empty, IconButton, Label, Pills, Txt, s } from '../../../ui/components';
import { colors as c, fonts } from '../../../ui/theme';
import { dateLabel } from '../../../domain/clinical';
import { getAuditEvents } from '../domain/security.service';
import type { AuditAction, AuditEvent } from '../domain/types';

const ACTION_ICONS: Record<string, any> = {
  login: LogIn,
  prontuario_view: Eye,
  record_create: Edit3,
  record_edit: Edit3,
  record_sign: CheckCircle,
  doc_export: Download,
  doc_share: Share2,
  app_unlocked: Shield
};

export default function AuditLogScreen() {
  const router = useRouter();
  const [events] = useState<AuditEvent[]>(getAuditEvents);
  const [filter, setFilter] = useState('Todos');

  const filtered = events.filter(ev => {
    if (filter === 'Acessos' && ev.action !== 'prontuario_view' && ev.action !== 'login') return false;
    if (filter === 'Assinaturas' && ev.action !== 'record_sign') return false;
    if (filter === 'Exportações' && ev.action !== 'doc_export') return false;
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Voltar" onPress={() => router.back()} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={styles.headerTitle}>Trilha de Auditoria</Txt>
          <Txt muted style={{ fontSize: 13 }}>Rastreabilidade e conformidade LGPD</Txt>
        </View>
        <Badge tone="green">Admin</Badge>
      </View>

      {/* Filtros em Pills */}
      <View style={styles.filterBar}>
        <Pills 
          options={['Todos', 'Acessos', 'Assinaturas', 'Exportações']} 
          value={filter} 
          onChange={setFilter} 
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => {
          const Icon = ACTION_ICONS[item.action] || Shield;
          const time = dateLabel(item.createdAt, "dd/MM 'às' HH:mm");

          return (
            <Card style={styles.eventCard}>
              <View style={s.row}>
                <View style={styles.iconCircle}>
                  <Icon size={18} color={c.text} />
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <Txt style={styles.actionTitle}>{item.actionLabel}</Txt>
                  <Txt muted style={{ fontSize: 12 }}>
                    Profissional: <Txt style={{ color: c.text, fontFamily: fonts.medium }}>{item.userName}</Txt>
                  </Txt>
                  {item.patientName && (
                    <Txt muted style={{ fontSize: 12 }}>Paciente: {item.patientName}</Txt>
                  )}
                  <Txt muted style={{ fontSize: 11, marginTop: 2 }}>IP: {item.ipAddress} · {time}</Txt>
                </View>

                <Badge tone="neutral">{item.action}</Badge>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          <Empty 
            title="Nenhum evento registrado" 
            description="Os registros de segurança e acesso aos prontuários aparecerão aqui automaticamente." 
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  headerTitle: { fontFamily: fonts.brand, fontSize: 22, color: c.text },
  filterBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  content: { padding: 16, gap: 10, paddingBottom: 100 },
  eventCard: { gap: 8, marginBottom: 8 },
  actionTitle: { fontFamily: fonts.semibold, fontSize: 14, color: c.text },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
