import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, AlertCircle, Clock, FileCheck, FileText, CloudUpload, ArrowRight } from 'lucide-react-native';
import { useStore } from '../../../data/store';
import { Badge, Empty, IconButton, Pills, Txt, safeBack, s } from '../../../ui/components';
import { colors as c, fonts, useTheme } from '../../../ui/theme';
import { computePendingItems } from '../domain/pending.service';

const CATEGORY_ICONS: Record<string, any> = {
  rascunho: Clock,
  assinatura: FileCheck,
  relatorio: FileText,
  retorno: AlertCircle,
  sync: CloudUpload
};

export default function PendingScreen() {
  const router = useRouter();
  const { colors: palette } = useTheme();
  const presentation = useStore(state => state.presentation);
  const data = useStore(st => st.data);
  const pendingSync = useStore(st => st.pending);
  const [filter, setFilter] = useState('Todas');

  const allItems = useMemo(() => computePendingItems(data, pendingSync), [data, pendingSync]);

  const filtered = allItems.filter(item => {
    if (filter === 'Rascunhos' && item.category !== 'rascunho') return false;
    if (filter === 'Assinaturas' && item.category !== 'assinatura') return false;
    if (filter === 'Retornos' && item.category !== 'retorno') return false;
    if (filter === 'Envio de dados' && item.category !== 'sync') return false;
    if (filter === 'Relatórios' && item.category !== 'relatorio') return false;
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Voltar" onPress={() => safeBack(router, '/more')} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={styles.headerTitle}>Pendências</Txt>
          <Txt muted>{allItems.length} registros precisam de atenção</Txt>
        </View>
        <Badge tone={allItems.length > 0 ? 'red' : 'green'}>
          {allItems.length}
        </Badge>
      </View>

      {/* Pills */}
      <View style={styles.filterBar}>
        <Pills
          options={['Todas', 'Rascunhos', 'Assinaturas', 'Retornos', 'Relatórios', 'Envio de dados']}
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
              accessibilityRole="button"
              onPress={() => router.push(item.route as never)}
              style={({ pressed }) => [styles.pendingCard, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && { opacity: 0.85 }]}
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
                  <Txt style={styles.itemTitle}>{presentation ? 'Pendência de atendimento' : item.title}</Txt>
                  <Txt muted>{presentation ? 'Desative o modo apresentação no Menu para consultar os detalhes.' : item.description}</Txt>
                </View>

                <ArrowRight size={18} color={c.tertiary} />
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Empty
            title="Nenhuma pendência neste filtro"
            description="Não há pendências nos registros carregados neste aparelho. Escolha outro filtro para conferir as demais categorias."
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
  headerTitle: { fontFamily: fonts.brand, fontSize: 22 },
  filterBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  content: { padding: 16, gap: 10, paddingBottom: 100 },
  pendingCard: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 14,
  },
  itemTitle: { fontFamily: fonts.semibold, fontSize: 16 },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
