import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, AlertCircle, Clock, FileCheck, FileText, CloudUpload, ArrowRight } from 'lucide-react-native';
import { useStore } from '../../../data/store';
import { Badge, Card, Empty, IconButton, Label, Pills, Txt, s } from '../../../ui/components';
import { colors as c, fonts } from '../../../ui/theme';
import { computePendingItems, type PendingItem } from '../domain/pending.service';

const CATEGORY_ICONS: Record<string, any> = {
  rascunho: Clock,
  assinatura: FileCheck,
  relatorio: FileText,
  retorno: AlertCircle,
  sync: CloudUpload
};

export default function PendingScreen() {
  const router = useRouter();
  const data = useStore(st => st.data);
  const pendingSync = useStore(st => st.pending);
  const [filter, setFilter] = useState('Todas');

  const allItems = useMemo(() => computePendingItems(data, pendingSync), [data, pendingSync]);

  const filtered = allItems.filter(item => {
    if (filter === 'Rascunhos' && item.category !== 'rascunho') return false;
    if (filter === 'Assinaturas' && item.category !== 'assinatura') return false;
    if (filter === 'Retornos' && item.category !== 'retorno') return false;
    if (filter === 'Sincronização' && item.category !== 'sync') return false;
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Voltar" onPress={() => router.back()} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={styles.headerTitle}>Central de Pendências</Txt>
          <Txt muted style={{ fontSize: 13 }}>{allItems.length} tarefa(s) clínica(s) aguardando ação</Txt>
        </View>
        <Badge tone={allItems.length > 0 ? 'red' : 'green'}>
          {allItems.length}
        </Badge>
      </View>

      {/* Pills */}
      <View style={styles.filterBar}>
        <Pills 
          options={['Todas', 'Rascunhos', 'Assinaturas', 'Retornos', 'Sincronização']} 
          value={filter} 
          onChange={setFilter} 
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => {
          const Icon = CATEGORY_ICONS[item.category] || AlertCircle;
          return (
            <Pressable 
              onPress={() => router.push(item.route as never)}
              style={({ pressed }) => [styles.pendingCard, pressed && { opacity: 0.85 }]}
            >
              <View style={s.row}>
                <View style={[
                  styles.iconCircle,
                  item.severity === 'alta' && { backgroundColor: c.redSoft },
                  item.severity === 'media' && { backgroundColor: c.amberSoft },
                  item.severity === 'baixa' && { backgroundColor: '#F0F0F0' },
                ]}>
                  <Icon 
                    size={20} 
                    color={item.severity === 'alta' ? c.red : item.severity === 'media' ? c.amber : c.secondary} 
                  />
                </View>

                <View style={{ flex: 1, gap: 3 }}>
                  <Txt style={styles.itemTitle}>{item.title}</Txt>
                  <Txt muted style={{ fontSize: 13, lineHeight: 18 }}>{item.description}</Txt>
                </View>

                <ArrowRight size={18} color={c.tertiary} />
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Empty 
            title="Nenhuma pendência!" 
            description="Todos os atendimentos estão assinados, os relatórios emitidos e os retornos em dia." 
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
  pendingCard: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 14,
  },
  itemTitle: { fontFamily: fonts.semibold, fontSize: 15, color: c.text },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
