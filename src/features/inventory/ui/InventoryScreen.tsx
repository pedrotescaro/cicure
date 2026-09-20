import React, { useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, Package, AlertTriangle, Clock, Check, X, ArrowDownRight, ArrowUpRight } from 'lucide-react-native';
import { useStore, uid } from '../../../data/store';
import { Badge, Button, Card, Empty, Field, IconButton, Label, SectionTitle, Txt, s } from '../../../ui/components';
import { colors as c, fonts } from '../../../ui/theme';
import { INITIAL_INVENTORY, checkInventoryAlerts } from '../domain/inventory.service';
import type { InventoryItem, InventoryLot } from '../domain/types';

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

export default function InventoryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [modalVisible, setModalVisible] = useState(false);

  // Form states do novo item
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [presentation, setPresentation] = useState('');
  const [qty, setQty] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [cost, setCost] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const alerts = checkInventoryAlerts(items);

  const handleCreateItem = () => {
    if (!name.trim() || !qty.trim()) {
      Alert.alert('Dados Incompletos', 'Informe o nome e a quantidade do item.');
      return;
    }

    const newItemId = uid();
    const newLot: InventoryLot = {
      id: uid(),
      itemId: newItemId,
      lotNumber: lotNumber.trim() || 'LOTE-NOVO',
      expiryDate: expiryDate.trim() || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      quantity: Number(qty) || 1
    };

    const newItem: InventoryItem = {
      id: newItemId,
      name: name.trim(),
      manufacturer: manufacturer.trim() || 'Genérico',
      presentation: presentation.trim() || 'Unidade',
      unit: 'un',
      currentStock: Number(qty) || 1,
      minStock: Number(minStock) || 5,
      cost: cost ? Number(cost) : undefined,
      lots: [newLot]
    };

    setItems(prev => [newItem, ...prev]);
    setModalVisible(false);
    setName('');
    setManufacturer('');
    setPresentation('');
    setQty('');
    setLotNumber('');
    setExpiryDate('');
    Alert.alert('Item Cadastrado', 'O produto foi adicionado com rastreabilidade de lote.');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Voltar" onPress={() => router.back()} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={styles.headerTitle}>Controle de Estoque</Txt>
          <Txt muted style={{ fontSize: 13 }}>Rastreabilidade de lotes e coberturas</Txt>
        </View>
        <IconButton 
          icon={Plus} 
          label="Cadastrar Produto" 
          onPress={() => setModalVisible(true)} 
          color={c.red} 
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 12 }}>
            {/* Alertas de Baixo Estoque */}
            {alerts.lowStockItems.length > 0 && (
              <Card style={{ backgroundColor: '#FEF3C7', borderColor: '#FCD34D', gap: 6, padding: 14 }}>
                <View style={s.row}>
                  <AlertTriangle size={18} color="#B45309" />
                  <Txt style={{ fontFamily: fonts.semibold, color: '#B45309', fontSize: 14 }}>
                    {alerts.lowStockItems.length} produto(s) abaixo do estoque mínimo
                  </Txt>
                </View>
                <Txt style={{ fontSize: 12, lineHeight: 16, color: '#92400E' }}>
                  {alerts.lowStockItems.map(i => `${i.name} (${i.currentStock} ${i.unit})`).join(', ')}
                </Txt>
              </Card>
            )}

            {/* Alertas de Validade Próxima */}
            {alerts.expiringItems.length > 0 && (
              <Card style={{ backgroundColor: '#FEE2E2', borderColor: '#FCA5A5', gap: 6, padding: 14 }}>
                <View style={s.row}>
                  <Clock size={18} color="#B91C1C" />
                  <Txt style={{ fontFamily: fonts.semibold, color: '#B91C1C', fontSize: 14 }}>
                    {alerts.expiringItems.length} lote(s) próximo(s) ao vencimento
                  </Txt>
                </View>
                <Txt style={{ fontSize: 12, lineHeight: 16, color: '#991B1B' }}>
                  {alerts.expiringItems.map(e => `${e.item.name} (${e.lot.lotNumber} - vence em ${formatDateBR(e.lot.expiryDate)})`).join('; ')}
                </Txt>
              </Card>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const isLow = item.currentStock <= item.minStock;
          const lot = item.lots[0];
          const isExpiringSoon = Boolean(
            lot && Date.parse(lot.expiryDate) < Date.now() + 60 * 86400000
          );

          return (
            <Card style={styles.itemCard}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Txt style={styles.itemName} numberOfLines={2}>{item.name}</Txt>
                  <Txt muted style={{ fontSize: 12 }} numberOfLines={1}>
                    {item.manufacturer} · {item.presentation}
                  </Txt>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Txt style={[styles.stockQty, isLow && { color: '#B91C1C' }]}>
                    {item.currentStock} <Txt style={{ fontSize: 13, fontFamily: fonts.medium, color: isLow ? '#B91C1C' : c.secondary }}>{item.unit}</Txt>
                  </Txt>
                  <Badge tone={isLow ? 'red' : 'green'}>
                    {isLow ? 'Estoque Baixo' : 'Em Estoque'}
                  </Badge>
                </View>
              </View>

              {/* Detalhes de Lote com Alto Contraste e Formatação Alinhada */}
              {lot && (
                <View style={[styles.lotBox, isExpiringSoon && styles.lotBoxExpiring]}>
                  <View style={styles.lotCol}>
                    <Txt style={styles.lotLabel}>LOTE ATUAL</Txt>
                    <Txt style={styles.lotValue} numberOfLines={1}>
                      {lot.lotNumber}
                    </Txt>
                  </View>

                  <View style={styles.lotDivider} />

                  <View style={styles.lotCol}>
                    <Txt style={[styles.lotLabel, isExpiringSoon && styles.lotExpiringLabel]}>
                      {isExpiringSoon ? 'VENCE EM BREVE' : 'VALIDADE'}
                    </Txt>
                    <Txt 
                      style={[styles.lotValue, isExpiringSoon && styles.lotExpiringValue]} 
                      numberOfLines={1}
                    >
                      {formatDateBR(lot.expiryDate)}
                    </Txt>
                  </View>
                </View>
              )}
            </Card>
          );
        }}
      />

      {/* Modal Cadastrar Item */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={s.between}>
              <Txt style={{ fontFamily: fonts.brand, fontSize: 20 }}>Novo Item de Estoque</Txt>
              <IconButton icon={X} label="Fechar" onPress={() => setModalVisible(false)} />
            </View>

            <Field 
              label="Nome do Produto / Cobertura" 
              placeholder="Ex.: Hidrogel com Alginato" 
              value={name} 
              onChangeText={setName} 
            />

            <Field 
              label="Fabricante / Marca" 
              placeholder="Ex.: Convatec, Coloplast, 3M" 
              value={manufacturer} 
              onChangeText={setManufacturer} 
            />

            <Field 
              label="Apresentação" 
              placeholder="Ex.: Tubo 85g / Placa 10x10 cm" 
              value={presentation} 
              onChangeText={setPresentation} 
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Field 
                label="Quantidade Atual" 
                keyboardType="numeric" 
                placeholder="Ex.: 10" 
                value={qty} 
                onChangeText={setQty} 
              />
              <Field 
                label="Estoque Mínimo" 
                keyboardType="numeric" 
                placeholder="Ex.: 5" 
                value={minStock} 
                onChangeText={setMinStock} 
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Field 
                label="Número do Lote" 
                placeholder="Ex.: LOTE-2026-X" 
                value={lotNumber} 
                onChangeText={setLotNumber} 
              />
              <Field 
                label="Data de Validade" 
                placeholder="AAAA-MM-DD" 
                value={expiryDate} 
                onChangeText={setExpiryDate} 
              />
            </View>

            <Button 
              title="Cadastrar Produto com Lote" 
              icon={Check} 
              onPress={handleCreateItem} 
            />
          </View>
        </View>
      </Modal>
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
  content: { padding: 16, gap: 10, paddingBottom: 100 },
  itemCard: { gap: 12, marginBottom: 10, padding: 16 },
  itemName: { fontFamily: fonts.semibold, fontSize: 15, color: '#111827', lineHeight: 20 },
  stockQty: { fontFamily: fonts.bold, fontSize: 20, color: '#111827' },
  lotBox: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  lotBoxExpiring: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  lotCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  lotLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#4B5563',
    textTransform: 'uppercase',
  },
  lotExpiringLabel: {
    color: '#B91C1C',
  },
  lotValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#111827',
  },
  lotExpiringValue: {
    color: '#B91C1C',
  },
  lotDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: c.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    padding: 20,
    gap: 14,
  },
});
