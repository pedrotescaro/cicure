import { useState } from 'react';
import { View } from 'react-native';
import { uid, useStore } from '../../../data/store';
import { Badge, Button, Card, Choices, Empty, Field, Txt } from '../../../ui/components';
import { SupportMessage, SupportPage, supportStyles as s } from '../../support/ui/SupportPage';
import { checkInventoryAlerts, createInventoryMovement, inventoryWithMovements } from '../domain/inventory.service';
import type { InventoryMovement } from '../domain/types';

export default function InventoryScreen() {
  const store = useStore();
  const items = inventoryWithMovements(store.data.inventory_items, store.data.inventory_movements);
  const [form, setForm] = useState<'product' | 'movement' | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [presentation, setPresentation] = useState('');
  const [minimum, setMinimum] = useState('0');
  const [unit, setUnit] = useState('unidade');
  const [quantity, setQuantity] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedLotId, setSelectedLotId] = useState('');
  const [visitId, setVisitId] = useState('');
  const [notes, setNotes] = useState('');
  const [kind, setKind] = useState<InventoryMovement['type']>('entrada');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [historyId, setHistoryId] = useState('');
  const selected = items.find(i => i.id === selectedId);
  const alerts = checkInventoryAlerts(items);
  const movementNames = { entrada: 'Entrada', saida_atendimento: 'Uso no atendimento', saida_descarte: 'Descarte', ajuste: 'Ajuste' };
  const visits = store.data.visits.filter(v => !v.deletedAt && store.data.patients.some(p => p.id === v.patientId && !p.deletedAt));
  const openMovement = (id: string) => { setSelectedId(id); setForm('movement'); setQuantity(''); setLotNumber(''); setExpiryDate(''); setSelectedLotId(''); setVisitId(''); setNotes(''); setError(''); setNotice(''); };
  const createProduct = async () => {
    setError(''); setNotice('');
    if (!name.trim() || !unit.trim() || !Number.isSafeInteger(Number(minimum)) || Number(minimum) < 0) { setError('Informe nome, unidade e um estoque mínimo inteiro igual ou maior que zero.'); return; }
    setBusy(true);
    try {
      const id = uid();
      await store.save('inventory_items', { id, name: name.trim(), manufacturer: manufacturer.trim(), presentation: presentation.trim(), unit: unit.trim(), minStock: Number(minimum), currentStock: 0, lots: [], createdAt: new Date().toISOString(), createdBy: store.authUserId || '' });
      setName(''); setManufacturer(''); setPresentation(''); setMinimum('0');
      openMovement(id); setNotice('Produto cadastrado. Registre a primeira entrada para adicionar saldo.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Produto não salvo. Tente novamente.'); }
    finally { setBusy(false); }
  };
  const saveMovement = async () => {
    if (!selected) return;
    setError(''); setNotice(''); setBusy(true);
    try {
      const visit = visits.find(v => v.id === visitId);
      const lot = selected.lots.find(l => l.lotNumber === lotNumber.trim() && l.expiryDate === expiryDate);
      const movement = createInventoryMovement({ id: uid(), item: selected, type: kind, quantity: Number(quantity), lotId: kind === 'entrada' ? lot?.id || uid() : selectedLotId,
        lotNumber, expiryDate, createdBy: store.authUserId || '', notes, visitId: visit?.id, patientId: visit?.patientId });
      await store.save('inventory_movements', movement);
      setForm(null); setNotice('Movimentação salva. O saldo e o histórico foram atualizados.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Movimentação não salva. Tente novamente.'); }
    finally { setBusy(false); }
  };
  return <SupportPage title="Materiais e estoque" subtitle="Cadastre os produtos e registre cada entrada, uso ou descarte.">
    <Button title={form === 'product' ? 'Fechar cadastro' : 'Cadastrar produto'} variant="outline" onPress={() => { setForm(form === 'product' ? null : 'product'); setError(''); }} />
    <SupportMessage error>{error}</SupportMessage><SupportMessage>{notice}</SupportMessage>
    {form === 'product' && <View style={s.section}>
      <Txt style={s.heading}>Novo produto</Txt>
      <Field label="Nome do produto *" value={name} onChangeText={setName} />
      <Field label="Fabricante" value={manufacturer} onChangeText={setManufacturer} />
      <Field label="Apresentação ou tamanho" value={presentation} onChangeText={setPresentation} />
      <Field label="Unidade de contagem *" value={unit} onChangeText={setUnit} placeholder="unidade, caixa ou frasco" />
      <Field label="Avisar quando o saldo chegar a" value={minimum} onChangeText={setMinimum} keyboardType="number-pad" />
      <Button title="Salvar produto e registrar entrada" loading={busy} onPress={() => void createProduct()} />
    </View>}
    {form === 'movement' && selected && <View style={s.section}>
      <Txt style={s.heading}>Movimentar {selected.name}</Txt>
      <Choices options={['Entrada', 'Uso no atendimento', 'Descarte']} value={movementNames[kind]} onChange={v => { setKind(v === 'Entrada' ? 'entrada' : v === 'Descarte' ? 'saida_descarte' : 'saida_atendimento'); setError(''); }} />
      <Field label={`Quantidade em ${selected.unit} *`} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
      {kind === 'entrada' ? <><Field label="Número do lote *" value={lotNumber} onChangeText={setLotNumber} /><Field label="Validade (AAAA-MM-DD) *" value={expiryDate} onChangeText={setExpiryDate} placeholder="2027-12-31" /></> : <>
        <Txt>Escolha o lote que saiu do estoque</Txt>
        {selected.lots.filter(l => l.quantity > 0).map(lot => <Button key={lot.id} title={`${lot.lotNumber} · ${lot.quantity} ${selected.unit} · vence ${lot.expiryDate.split('-').reverse().join('/')}`} variant={selectedLotId === lot.id ? 'dark' : 'outline'} onPress={() => setSelectedLotId(lot.id)} />)}
        {kind === 'saida_atendimento' && <><Txt>Escolha o atendimento *</Txt>{visits.length === 0 ? <Txt muted>Cadastre um atendimento antes de registrar o uso de material.</Txt> : visits.map(visit => <Button key={visit.id} title={`${store.data.patients.find(p => p.id === visit.patientId)?.name} · ${visit.date.split('-').reverse().join('/')} · ${store.data.wounds.find(w => w.id === visit.woundId)?.location || 'Ferida'}`} variant={visitId === visit.id ? 'dark' : 'outline'} onPress={() => setVisitId(visit.id)} />)}</>}
      </>}
      <Field label={kind === 'saida_descarte' ? 'Motivo do descarte *' : 'Observação'} value={notes} onChangeText={setNotes} multiline />
      <Button title="Confirmar movimentação" loading={busy} onPress={() => void saveMovement()} /><Button title="Cancelar movimentação" variant="ghost" onPress={() => setForm(null)} />
    </View>}
    {!!alerts.lowStockItems.length && <Txt style={s.body}>Atenção: {alerts.lowStockItems.length} produto(s) no estoque mínimo ou abaixo dele.</Txt>}
    {!!alerts.expiringItems.length && <Txt style={s.body}>Confira {alerts.expiringItems.length} lote(s) vencido(s) ou com vencimento nos próximos 60 dias.</Txt>}
    {items.length === 0 && form !== 'product' && <Empty title="Seu estoque começa aqui" description="Cadastre os materiais que você usa. Nenhum saldo é criado automaticamente." action="Cadastrar primeiro produto" onPress={() => setForm('product')} />}
    {items.map(item => <Card key={item.id} style={{ borderRadius: 16 }}>
      <View style={s.section}><Txt style={s.heading}>{item.name}</Txt><Txt muted>{[item.manufacturer, item.presentation].filter(Boolean).join(' · ')}</Txt><Badge tone={item.currentStock <= item.minStock ? 'amber' : 'green'}>{item.currentStock} {item.unit} disponíveis</Badge></View>
      {item.lots.map(lot => <View key={lot.id} style={{ gap: 4 }}><Txt>Lote {lot.lotNumber} · {lot.quantity} {item.unit}</Txt><Txt muted>Validade: {lot.expiryDate.split('-').reverse().join('/')}</Txt></View>)}
      <Button title={`Registrar entrada ou saída de ${item.name}`} variant="outline" onPress={() => openMovement(item.id)} />
      <Button title={historyId === item.id ? 'Fechar histórico' : 'Ver histórico de movimentações'} variant="ghost" onPress={() => setHistoryId(historyId === item.id ? '' : item.id)} />
      {historyId === item.id && store.data.inventory_movements.filter(m => m.itemId === item.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(m => <View key={m.id} style={{ gap: 4 }}><Txt>{movementNames[m.type]} · {m.quantity} {item.unit} · {new Date(m.createdAt).toLocaleDateString('pt-BR')}</Txt><Txt muted>Lote {m.lotNumber}{m.notes ? ` · ${m.notes}` : ''}{m.patientId ? ` · ${store.data.patients.find(p => p.id === m.patientId)?.name || 'Paciente'}` : ''}</Txt></View>)}
    </Card>)}
  </SupportPage>;
}
