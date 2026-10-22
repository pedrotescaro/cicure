import React, { useState } from 'react';
import { View } from 'react-native';
import type { Visit } from '../domain/types';
import { useStore, uid } from '../data/store';
import { inventoryWithMovements, createInventoryMovement } from '../features/inventory/domain/inventory.service';
import { Button, Choices, Field, Txt } from './components';

export function ClinicalInventoryUse({ visit, ensureSaved }: { visit: Visit; ensureSaved: () => Promise<void> }) {
  const store = useStore();
  const [itemId, setItemId] = useState('');
  const [lotId, setLotId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const items = inventoryWithMovements(store.data.inventory_items, store.data.inventory_movements);
  const item = items.find(candidate => candidate.id === itemId);
  const lot = item?.lots.find(candidate => candidate.id === lotId);
  const recorded = store.data.inventory_movements.filter(movement => movement.visitId === visit.id && movement.type === 'saida_atendimento');
  const save = async () => {
    setBusy(true); setMessage('');
    try {
      await ensureSaved();
      const current = useStore.getState();
      const material = inventoryWithMovements(current.data.inventory_items, current.data.inventory_movements).find(candidate => candidate.id === itemId);
      if (!material) throw new Error('Selecione o material utilizado.');
      const movement = createInventoryMovement({ id: uid(), item: material, type: 'saida_atendimento', quantity: Number(quantity), createdBy: current.authUserId ?? '', lotId, visitId: visit.id, patientId: visit.patientId, referenceId: 'visit:' + visit.id + ':item:' + itemId + ':lot:' + lotId, existingMovements: current.data.inventory_movements });
      await current.save('inventory_movements', movement);
      setMessage('Uso do material salvo neste aparelho e saldo atualizado.'); setConfirming(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível registrar o material. Tente novamente.'); }
    finally { setBusy(false); }
  };
  return <View style={{ gap: 12, paddingTop: 12 }}>
    <Txt style={{ fontSize: 18 }}>Materiais do estoque</Txt>
    <Txt muted>A baixa é opcional e exige confirmação. O nome do curativo não movimenta o estoque automaticamente.</Txt>
    {recorded.map(movement => <Txt key={movement.id}>{items.find(candidate => candidate.id === movement.itemId)?.name ?? 'Material'} · {movement.quantity} unidade(s) · lote {movement.lotNumber}</Txt>)}
    {!items.length ? <Txt muted>Cadastre materiais e lotes em Menu → Estoque para registrar o uso aqui.</Txt> : <>
      <Choices options={items.map(candidate => candidate.name + ' · saldo ' + candidate.currentStock)} value={item ? item.name + ' · saldo ' + item.currentStock : ''} onChange={label => { setItemId(items.find(candidate => candidate.name + ' · saldo ' + candidate.currentStock === label)?.id ?? ''); setLotId(''); setConfirming(false); }} />
      {item && <Choices options={item.lots.map(candidate => candidate.lotNumber + ' · ' + candidate.quantity + ' unidade(s)')} value={lot ? lot.lotNumber + ' · ' + lot.quantity + ' unidade(s)' : ''} onChange={label => { setLotId(item.lots.find(candidate => candidate.lotNumber + ' · ' + candidate.quantity + ' unidade(s)' === label)?.id ?? ''); setConfirming(false); }} />}
      <Field label="Quantidade utilizada do lote (unidades)" value={quantity} keyboardType="number-pad" onChangeText={value => { setQuantity(value.replace(/\D/g, '')); setConfirming(false); }} />
      {confirming ? <><Txt>Confirmar uso de {quantity} unidade(s) de {item?.name}, lote {lot?.lotNumber}, neste atendimento?</Txt><Button title="Confirmar baixa do material" loading={busy} onPress={() => void save()} /><Button title="Voltar e conferir" variant="outline" onPress={() => setConfirming(false)} /></> : <Button title="Registrar uso do material" variant="outline" disabled={!item || !lot || !(Number(quantity) > 0)} onPress={() => setConfirming(true)} />}
    </>}
    {Boolean(message) && <Txt accessibilityLiveRegion="polite">{message}</Txt>}
  </View>;
}
