import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ChevronLeft, 
  CloudCheck, 
  Clock, 
  CloudUpload, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Cloud,
  CloudOff,
  Database,
  Building2,
  User
} from 'lucide-react-native';
import { useStore } from '../../../data/store';
import { useNetworkStatus } from '../../../data/network';
import { Badge, Button, Card, Empty, IconButton, Label, Pills, Txt, safeBack, s } from '../../../ui/components';
import { colors as c, fonts, useTheme } from '../../../ui/theme';
import { queue } from '../../../data/storage';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import type { SyncItem, SyncItemStatus } from '../domain/types';

const STATUS_CONFIG: Record<SyncItemStatus, { label: string; tone: 'green' | 'amber' | 'neutral' | 'red'; icon: any }> = {
  sincronizado: { label: 'Sincronizado', tone: 'green', icon: CheckCircle2 },
  aguardando: { label: 'Aguardando envio', tone: 'neutral', icon: Clock },
  enviando: { label: 'Enviando...', tone: 'amber', icon: CloudUpload },
  erro: { label: 'Erro no envio', tone: 'red', icon: XCircle },
  conflito: { label: 'Conflito de versão', tone: 'amber', icon: AlertTriangle }
};

export default function SyncCenterScreen() {
  const router = useRouter();
  const { colors: c } = useTheme();
  const store = useStore();
  const { isOnline, pending, syncState } = useNetworkStatus();
  const { workMode, activeOrg } = store;
  const [items, setItems] = useState<SyncItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<SyncItem | undefined>(undefined);
  const [filter, setFilter] = useState('Todos');

  useEffect(() => {
    let active = true;
    void queue(store.scope).then(rows => {
      if (active) setItems(rows.map(row => ({
        id: row.id, idempotencyKey: row.id, entityKind: row.kind, entityId: row.entityId,
        title: `Registro pendente · ${row.entityId}`,
        status: row.error ? 'erro' : 'aguardando', version: row.version,
        attempts: row.attempts, errorMessage: row.error,
      })));
    }).catch(() => { if (active) Alert.alert('Fila indisponível', 'Não foi possível ler os envios pendentes. Tente novamente.'); });
    return () => { active = false; };
  }, [store.scope, pending, syncState]);

  const handleSyncAll = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await store.sync();
      const current = useStore.getState();
      if (current.syncState === 'synced' && current.pending === 0) {
        Alert.alert('Sincronização concluída', 'Não há envios pendentes.');
      } else {
        Alert.alert('Registros salvos no aparelho', current.error || 'O envio à nuvem ainda não foi confirmado. Tente novamente quando houver conexão.');
      }
    } finally {
      setSyncing(false);
    }
  };

  const filtered = items.filter(i => {
    if (filter === 'Pendentes' && i.status !== 'aguardando' && i.status !== 'enviando') return false;
    if (filter === 'Conflitos' && i.status !== 'conflito') return false;
    if (filter === 'Erros' && i.status !== 'erro') return false;
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Voltar" onPress={() => safeBack(router, '/more')} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={styles.headerTitle}>Central de Sincronização</Txt>
          <Txt muted style={{ fontSize: 13 }}>SQLite Offline-First · Fila Idempotente</Txt>
        </View>
        <IconButton 
          icon={RefreshCw} 
          label="Sincronizar" 
          onPress={handleSyncAll}
          color={c.red} 
        />
      </View>

      {/* Pills */}
      <View style={styles.filterBar}>
        <Pills 
          options={['Todos', 'Pendentes', 'Conflitos', 'Erros']} 
          value={filter} 
          onChange={setFilter} 
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 12 }}>
            {/* Status da Conectividade em Tempo Real */}
            <Card style={{ 
              backgroundColor: isOnline ? '#F0FDF4' : '#F9FAFB', 
              borderColor: isOnline ? '#BBF7D0' : '#E5E7EB',
              gap: 8 
            }}>
              <View style={s.between}>
                <View style={s.row}>
                  {isOnline ? (
                    <Cloud size={20} color={c.green} />
                  ) : (
                    <CloudOff size={20} color={c.secondary} />
                  )}
                  <Txt style={{ fontFamily: fonts.semibold, fontSize: 14, color: isOnline ? '#166534' : c.text }}>
                    {isOnline ? 'Conexão com a Nuvem Ativa' : 'Modo Offline Ativo (SQLite Local)'}
                  </Txt>
                </View>
                <Badge tone={isOnline ? 'green' : 'neutral'}>
                  {isOnline ? 'Online' : 'Offline'}
                </Badge>
              </View>
              <Txt muted style={{ fontSize: 12, lineHeight: 18 }}>
                {isOnline 
                  ? 'Você está conectado à internet. O aplicativo sincroniza automaticamente seus atendimentos com o banco de dados Supabase na nuvem.'
                  : 'Você está sem internet ou em visita domiciliar. 100% dos dados continuam sendo gravados no SQLite deste dispositivo. Quando a internet voltar, a sincronização acontecerá de forma automática.'}
              </Txt>
            </Card>

            {/* Status do Workspace e Fila */}
            <Card style={{ backgroundColor: '#FAFAFA', gap: 6 }}>
              <View style={s.between}>
                <Txt muted style={{ fontSize: 12 }}>Workspace Atual:</Txt>
                <View style={[s.row, { gap: 6 }]}>
                  {workMode === 'individual' ? (
                    <User size={14} color={c.text} />
                  ) : (
                    <Building2 size={14} color={c.text} />
                  )}
                  <Txt style={{ fontFamily: fonts.semibold, fontSize: 12 }}>
                    {workMode === 'individual' ? 'Consultório Individual' : activeOrg.name}
                  </Txt>
                </View>
              </View>
              <View style={s.between}>
                <Txt muted style={{ fontSize: 12 }}>Itens Aguardando Envio:</Txt>
                <Badge tone={pending > 0 ? 'amber' : 'green'}>
                  {pending > 0 ? `${pending} pendente(s)` : 'Tudo em dia'}
                </Badge>
              </View>
            </Card>

            <Button 
              title="Sincronizar Agora com a Nuvem" 
              icon={RefreshCw} 
              loading={syncing} 
              onPress={handleSyncAll}
            />
          </View>
        }
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status];
          const Icon = cfg.icon;

          return (
            <Card style={styles.syncCard}>
              <View style={s.between}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt style={styles.itemTitle}>{item.title}</Txt>
                  <Txt muted style={{ fontSize: 12 }}>Chave idempotente: {item.idempotencyKey}</Txt>
                  {item.errorMessage && (
                    <Txt style={{ color: c.red, fontSize: 12, marginTop: 2 }}>{item.errorMessage}</Txt>
                  )}
                </View>

                <Badge tone={cfg.tone}>{cfg.label}</Badge>
              </View>

              {item.status === 'conflito' && (
                <View style={styles.conflictAction}>
                  <Button 
                    title="Resolver Conflito de Versões" 
                    variant="dark" 
                    small 
                    icon={AlertTriangle} 
                    onPress={() => setSelectedConflict(item)} 
                  />
                </View>
              )}

              {item.status === 'erro' && (
                <View style={styles.conflictAction}>
                  <Button 
                    title="Tentar Novamente (Backoff)" 
                    variant="outline" 
                    small 
                    icon={RefreshCw} 
                    onPress={handleSyncAll}
                  />
                </View>
              )}
            </Card>
          );
        }}
      />

      {/* Modal de Conflitos */}
      <ConflictResolutionModal 
        visible={Boolean(selectedConflict)}
        item={selectedConflict}
        onClose={() => setSelectedConflict(undefined)}
        onResolve={res => {

          setSelectedConflict(undefined);
          Alert.alert('Resolução indisponível', 'O conflito precisa ser confirmado pelo servidor antes de alterar o prontuário.');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  headerTitle: { fontFamily: fonts.brand, fontSize: 22 },
  filterBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  content: { padding: 16, gap: 10, paddingBottom: 100 },
  syncCard: { gap: 10, marginBottom: 8 },
  itemTitle: { fontFamily: fonts.semibold, fontSize: 15 },
  conflictAction: {
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  }
});
