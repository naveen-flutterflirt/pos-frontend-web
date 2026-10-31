export type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'drive_thru';
export type OrderChannel = 'pos' | 'captain' | 'kiosk' | 'qr' | 'swiggy' | 'zomato' | 'ondc';
export type OrderStatus = 'open' | 'billed' | 'completed' | 'cancelled';
export type KotStatus = 'pending' | 'in_progress' | 'ready' | 'served' | 'cancelled';
export type TableStatus = 'free' | 'occupied' | 'bill_printed' | 'reserved';
export type PaymentMode = 'cash' | 'upi' | 'card' | 'wallet' | 'split';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface ModifierOption {
  id: string;
  name: string;
  priceDelta: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
}

export interface MenuItemVariant {
  id: string;
  itemId: string;
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  mrp?: number;
  unit: string;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  taxGroupId: string;
  name: string;
  shortName?: string;
  description?: string;
  hsnSac: string;
  foodType: 'veg' | 'non_veg' | 'egg';
  imageUrl?: string;
  defaultStation?: string;
  isWeighed?: boolean;
  isActive: boolean;
  variants: MenuItemVariant[];
  modifierGroups?: ModifierGroup[];
}

export interface MenuCategory {
  id: string;
  name: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface SelectedModifier {
  modifierId: string;
  nameSnapshot: string;
  priceDelta: number;
  qty: number;
}

export interface CartLineItem {
  id: string;
  variantId: string;
  itemName: string;
  variantName: string;
  hsnSac: string;
  unitPrice: number;
  qty: number;
  modifiers: SelectedModifier[];
  modifiersTotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  notes?: string;
  isVoid?: boolean;
  voidReason?: string;
  kotId?: string;
  course?: number;
}

export interface TaxProfile {
  outletStateCode: string; // e.g. "29" for Karnataka
  customerStateCode?: string; // place of supply
  defaultGstRate: number; // e.g. 5%
  isInclusive: boolean;
}

export interface BillTotals {
  subtotal: number;
  discountTotal: number;
  serviceCharge: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  grandTotal: number;
}

export interface ActiveOrder {
  id: string;
  outletId: string;
  deviceId: string;
  orderNo: string;
  type: OrderType;
  channel: OrderChannel;
  status: OrderStatus;
  tableId?: string;
  tableName?: string;
  tokenNo?: number;
  covers?: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerLoyaltyPoints?: number;
  discountCode?: string;
  discountPercent?: number;
  notes?: string;
  items: CartLineItem[];
  totals: BillTotals;
  createdAt: string;
  updatedAt: string;
}

export interface DiningTable {
  id: string;
  areaId: string;
  areaName: string;
  label: string;
  seats: number;
  status: TableStatus;
  currentOrderId?: string;
  currentBillAmount?: number;
  occupiedSince?: string;
  reservedTime?: string;
}

export interface CustomerSummary {
  id: string;
  phone: string;
  name: string;
  email?: string;
  loyaltyPoints: number;
  visitCount: number;
  totalSpent: number;
}

export interface ShiftInfo {
  id: string;
  outletId: string;
  deviceId: string;
  cashierName: string;
  openedAt: string;
  openingCash: number;
  expectedCash: number;
  totalCard: number;
  totalUpi: number;
  cashMovements: {
    type: 'pay_in' | 'pay_out' | 'cash_drop';
    amount: number;
    reason: string;
    time: string;
  }[];
  isOpen: boolean;
}

