import type { InventoryItem, InventoryLot, InventoryMovement } from './types';

// Instalações novas começam sem produtos ou movimentos demonstrativos.
export const INITIAL_INVENTORY: InventoryItem[] = [];

export function inventoryWithMovements(items: InventoryItem[], movements: InventoryMovement[]): InventoryItem[] {
  return items.filter(item => !item.deletedAt).map(item => {
    const lots: InventoryLot[] = item.lots.map(lot => ({ ...lot }));
    let currentStock = item.currentStock;
    const seen = new Set<string>();
    for (const movement of movements.filter(m => m.itemId === item.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      const key = movement.referenceId || movement.id;
      if (seen.has(key)) continue;
      seen.add(key);
      const sign = movement.type === 'entrada' || movement.type === 'ajuste' ? 1 : -1;
      currentStock += sign * movement.quantity;
      if (movement.lotId) {
        let lot = lots.find(l => l.id === movement.lotId);
        if (!lot && sign > 0) {
          lot = { id: movement.lotId, itemId: item.id, lotNumber: movement.lotNumber || '', expiryDate: movement.expiryDate || '', quantity: 0 };
          lots.push(lot);
        }
        if (lot) lot.quantity += sign * movement.quantity;
      }
    }
    return { ...item, currentStock, lots };
  });
}

export function validISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function checkInventoryAlerts(items: InventoryItem[], today = new Date().toISOString().slice(0, 10)) {
  const thresholdTime = Date.parse(`${today}T12:00:00Z`) + 60 * 86400000;
  return {
    lowStockItems: items.filter(item => item.currentStock <= item.minStock),
    expiringItems: items.flatMap(item => item.lots.filter(lot => lot.quantity > 0 && validISODate(lot.expiryDate) && Date.parse(`${lot.expiryDate}T12:00:00Z`) <= thresholdTime).map(lot => ({ item, lot }))),
  };
}

export function createInventoryMovement(input: {
  id: string; item: InventoryItem; type: InventoryMovement['type']; quantity: number;
  createdBy: string; lotId: string; lotNumber?: string; expiryDate?: string;
  notes?: string; visitId?: string; patientId?: string; referenceId?: string;
  now?: string; existingMovements?: InventoryMovement[];
}): InventoryMovement {
  if (!input.createdBy) throw new Error('Entre na sua conta para movimentar o estoque.');
  if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) throw new Error('Informe uma quantidade inteira maior que zero.');
  if (!input.lotId) throw new Error('Selecione um lote.');
  const existing = input.referenceId && input.existingMovements?.find(m => m.referenceId === input.referenceId);
  if (existing) {
    if (existing.itemId !== input.item.id || existing.quantity !== input.quantity || existing.lotId !== input.lotId || existing.type !== input.type) throw new Error('Esta movimentação já foi registrada com outros dados.');
    return existing;
  }
  const now = input.now || new Date().toISOString();
  const lot = input.item.lots.find(l => l.id === input.lotId);
  const entering = input.type === 'entrada' || input.type === 'ajuste';
  if (entering) {
    if (!input.lotNumber?.trim() || !validISODate(input.expiryDate || '')) throw new Error('Informe o número do lote e uma validade válida.');
    if (input.expiryDate! < now.slice(0, 10)) throw new Error('Não registre entrada de lote vencido.');
    if (lot && (lot.lotNumber !== input.lotNumber?.trim() || lot.expiryDate !== input.expiryDate)) throw new Error('Este lote já está cadastrado com outros dados.');
  } else {
    if (!lot || lot.quantity < input.quantity || input.item.currentStock < input.quantity) throw new Error('O lote não tem saldo suficiente. Confira a quantidade.');
    if (input.type === 'saida_atendimento' && (!input.visitId || !input.patientId)) throw new Error('Selecione o atendimento em que o material foi usado.');
    if (input.type === 'saida_atendimento' && (!validISODate(lot.expiryDate) || lot.expiryDate < now.slice(0, 10))) throw new Error('Lote vencido ou sem validade: registre o descarte, sem usar no atendimento.');
  }
  if (input.type === 'saida_descarte' && !input.notes?.trim()) throw new Error('Informe o motivo do descarte.');
  return { id: input.id, itemId: input.item.id, type: input.type, quantity: input.quantity, lotId: input.lotId,
    lotNumber: entering ? input.lotNumber!.trim() : lot!.lotNumber,
    expiryDate: entering ? input.expiryDate : lot!.expiryDate,
    notes: input.notes?.trim(), visitId: input.visitId, patientId: input.patientId,
    referenceId: input.referenceId, createdAt: now, createdBy: input.createdBy };
}
