import type { InventoryItem, InventoryLot, InventoryMovement } from './types';
import { uid } from '../../../data/store';

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-1',
    name: 'Hidrofibra com Prata e Fibras Reforçadas',
    manufacturer: 'ConvaTec',
    presentation: 'Placa 10 × 10 cm',
    unit: 'un',
    currentStock: 12,
    minStock: 5,
    cost: 45.0,
    lots: [
      {
        id: 'lot-101',
        itemId: 'inv-1',
        lotNumber: 'LOTE-2026A',
        expiryDate: '2026-11-30',
        quantity: 12
      }
    ]
  },
  {
    id: 'inv-2',
    name: 'Espuma de Poliuretano com Silicone',
    manufacturer: 'Mölnlycke',
    presentation: 'Placa 10 × 10 cm',
    unit: 'un',
    currentStock: 3, // Abaixo do mínimo!
    minStock: 6,
    cost: 38.0,
    lots: [
      {
        id: 'lot-201',
        itemId: 'inv-2',
        lotNumber: 'LOTE-7890B',
        expiryDate: '2026-10-15', // Próximo ao vencimento!
        quantity: 3
      }
    ]
  },
  {
    id: 'inv-3',
    name: 'Solução de Limpeza com PHMB 0,1%',
    manufacturer: 'B. Braun',
    presentation: 'Frasco 350 mL',
    unit: 'frasco',
    currentStock: 8,
    minStock: 3,
    cost: 62.0,
    lots: [
      {
        id: 'lot-301',
        itemId: 'inv-3',
        lotNumber: 'LOTE-4433C',
        expiryDate: '2027-04-20',
        quantity: 8
      }
    ]
  },
  {
    id: 'inv-4',
    name: 'Alginato de Cálcio e Sódio',
    manufacturer: 'Coloplast',
    presentation: 'Fita 30 cm',
    unit: 'un',
    currentStock: 15,
    minStock: 4,
    cost: 29.0,
    lots: [
      {
        id: 'lot-401',
        itemId: 'inv-4',
        lotNumber: 'LOTE-9988D',
        expiryDate: '2027-08-10',
        quantity: 15
      }
    ]
  }
];

export function checkInventoryAlerts(items: InventoryItem[]): {
  lowStockItems: InventoryItem[];
  expiringItems: { item: InventoryItem; lot: InventoryLot }[];
} {
  const lowStockItems: InventoryItem[] = [];
  const expiringItems: { item: InventoryItem; lot: InventoryLot }[] = [];
  
  // Alerta se vence em menos de 60 dias
  const thresholdTime = Date.now() + 60 * 86400000;

  items.forEach(item => {
    if (item.currentStock <= item.minStock) {
      lowStockItems.push(item);
    }
    item.lots?.forEach(lot => {
      if (Date.parse(lot.expiryDate) < thresholdTime) {
        expiringItems.push({ item, lot });
      }
    });
  });

  return { lowStockItems, expiringItems };
}

/**
 * Realiza baixa automática de estoque a partir de atendimento clínico.
 * Garante rastreabilidade de lote e vinculação ao atendimento.
 */
export function deductStockForVisit(
  items: InventoryItem[],
  itemId: string,
  qty: number,
  visitId: string,
  patientId: string
): { updatedItems: InventoryItem[]; movement: InventoryMovement } {
  const item = items.find(i => i.id === itemId);
  if (!item) throw new Error('Item não encontrado');

  const lot = item.lots[0]; // Pega o lote mais antigo (FIFO)
  const lotNumber = lot?.lotNumber || 'SEM-LOTE';

  const movement: InventoryMovement = {
    id: uid(),
    itemId,
    lotId: lot?.id,
    lotNumber,
    type: 'saida_atendimento',
    quantity: qty,
    visitId,
    patientId,
    notes: `Baixa automática em atendimento clínico. Lote: ${lotNumber}`,
    createdAt: new Date().toISOString(),
    createdBy: 'Profissional autenticado'
  };

  const updatedItems = items.map(i => {
    if (i.id === itemId) {
      return {
        ...i,
        currentStock: Math.max(0, i.currentStock - qty),
        lots: i.lots.map(l => l.id === lot?.id ? { ...l, quantity: Math.max(0, l.quantity - qty) } : l)
      };
    }
    return i;
  });

  return { updatedItems, movement };
}
