export type InventoryLot = {
  id: string;
  itemId: string;
  lotNumber: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: number;
};

export type InventoryItem = {
  id: string;
  name: string;
  manufacturer: string;
  presentation: string;
  unit: string;
  currentStock: number;
  minStock: number;
  cost?: number;
  lots: InventoryLot[];
};

export type InventoryMovement = {
  id: string;
  itemId: string;
  lotId?: string;
  type: 'entrada' | 'saida_atendimento' | 'saida_descarte' | 'ajuste';
  quantity: number;
  visitId?: string;
  patientId?: string;
  lotNumber?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
};
