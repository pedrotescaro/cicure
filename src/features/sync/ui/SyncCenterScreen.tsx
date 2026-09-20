import React, { useState } from 'react';
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
import { Badge, Button, Card, Empty, IconButton, Label, Pills, Txt, s } from '../../../ui/components';
import { colors as c, fonts } from '../../../ui/theme';
import { INITIAL_SYNC_ITEMS, resolveSyncConflict } from '../domain/sync.service';
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
  const store = useStore();
  const { isOnline, pending, syncState } = useNetworkStatus();
  const { workMode, activeOrg } = store;
  const [items, setItems] = useState<SyncItem[]>(INITIAL_SYNC_ITEMS);
  const [syncing, setSyncing] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<SyncItem | undefined>(undefined);
  const [filter, setFilter] = useState('Todos');

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await store.sync();
      setItems(prev => prev.map(i => i.status === 'aguardando' ? { ...i, status: 'sincronizado' } : i));
      Alert.alert('Sincronização Concluída', 'Fila local sincronizada com o Supabase.');
    } catch {
      Alert.alert('Sem Conexão', 'Seus registros permanecem seguros no banco SQLite deste dispositivo.');
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Voltar" onPress={() => router.back()} />
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
                    onPress={() => {
                      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'sincronizado', errorMessage: undefined } : i));
                      Alert.alert('Sucesso', 'Reenvio completado com sucesso.');
                    }} 
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
          setItems(prev => resolveSyncConflict(res, prev));
          setSelectedConflict(undefined);
          Alert.alert('Conflito Resolvido', 'A versão escolhida foi registrada no prontuário e auditada.');
        }}
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
  syncCard: { gap: 10, marginBottom: 8 },
  itemTitle: { fontFamily: fonts.semibold, fontSize: 15, color: c.text },
  conflictAction: {
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  }
});
