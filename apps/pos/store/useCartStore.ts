import { create } from 'zustand';
import {
  ActiveOrder,
  CartLineItem,
  MenuItem,
  MenuItemVariant,
  OrderType,
  SelectedModifier,
  computeOrderTotals,
  calculateLineItemTotal,
  round2,
} from '@bizbox/pos-core';
import { mockTaxProfile } from '../data/mockData';
import { db, syncEngine } from '@bizbox/offline';
import { getApiBaseUrl } from '../lib/config';

export interface CustomerInfo {
  id?: string;
  name: string;
  phone: string;
  points: number;
}

export interface OutletInfo {
  id: string;
  code: string;
  name: string;
  city: string;
}

export const OUTLETS: OutletInfo[] = [
  { id: 'BLR01', code: 'BLR01', name: 'Indiranagar (BLR01)', city: 'Bengaluru, KA' },
  { id: 'BLR02', code: 'BLR02', name: 'Koramangala (BLR02)', city: 'Bengaluru, KA' },
  { id: 'DEL01', code: 'DEL01', name: 'Connaught Place (DEL01)', city: 'New Delhi, DL' },
  { id: 'MUM01', code: 'MUM01', name: 'Bandra West (MUM01)', city: 'Mumbai, MH' },
];

export const getInitialOutlet = (): OutletInfo => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('bizbox_pos_outlet');
    if (saved) {
      const found = OUTLETS.find(
        (o) =>
          o.code.toLowerCase() === saved.toLowerCase() ||
          o.id.toLowerCase() === saved.toLowerCase() ||
          o.name.toLowerCase().includes(saved.toLowerCase())
      );
      if (found) return found;
    }
  }
  return OUTLETS[0];
};

interface CartState {
  order: ActiveOrder;
  serviceType: OrderType;
  orderChannel: 'pos' | 'swiggy' | 'zomato' | 'ondc';
  activeOutlet: OutletInfo;
  selectedTable: { id: string; label: string; guests: number } | null;
  selectedCustomer: CustomerInfo | null;
  appliedDiscount: { code: string; percent: number } | null;
  syncStatus: 'synced' | 'syncing' | 'offline';
  pendingSyncCount: number;

  setServiceType: (type: OrderType) => void;
  setOrderChannel: (channel: 'pos' | 'swiggy' | 'zomato' | 'ondc') => void;
  setOutlet: (outlet: OutletInfo | string) => void;
  setTable: (table: { id: string; label: string; guests: number } | null) => void;
  setCustomer: (customer: CustomerInfo | null) => void;
  addItem: (item: MenuItem, variant: MenuItemVariant, modifiers?: SelectedModifier[], notes?: string) => void;
  updateItemQty: (itemId: string, delta: number) => void;
  removeItem: (itemId: string) => void;
  applyDiscount: (code: string, percent: number) => void;
  removeDiscount: () => void;
  fireKOT: () => Promise<void>;
  settleBill: (paymentMode: string) => Promise<{ invoiceNo: string; grandTotal: number }>;
  clearCart: () => void;
  initSyncListener: () => void;
}

const createInitialOrder = (outletCode: string = 'BLR01'): ActiveOrder => ({
  id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ord_${Date.now()}`,
  outletId: outletCode,
  deviceId: 'pos-term-01',
  orderNo: `T2-${String(Math.floor(1000 + Math.random() * 9000))}`,
  type: 'dine_in',
  channel: 'pos',
  status: 'open',
  items: [],
  totals: {
    subtotal: 0,
    discountTotal: 0,
    serviceCharge: 0,
    taxableValue: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    roundOff: 0,
    grandTotal: 0,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const useCartStore = create<CartState>((set, get) => {
  const initialOutlet = getInitialOutlet();

  return {
    order: createInitialOrder(initialOutlet.code),
    activeOutlet: initialOutlet,
    serviceType: 'dine_in',
    orderChannel: 'pos',
    selectedTable: { id: 'eeeeeeee-0000-0000-0000-000000000001', label: 'T1', guests: 2 },
    selectedCustomer: { name: 'Walk-in Guest', phone: '—', points: 0 },
    appliedDiscount: null,
    syncStatus: 'synced',
    pendingSyncCount: 0,

    initSyncListener: () => {
      syncEngine.subscribe((status, count) => {
        set({
          syncStatus: !navigator.onLine ? 'offline' : status === 'syncing' ? 'syncing' : 'synced',
          pendingSyncCount: count,
        });
      });
    },

    setOutlet: (target) => {
      const outlet =
        typeof target === 'string'
          ? OUTLETS.find(
              (o) =>
                o.code.toLowerCase() === target.toLowerCase() ||
                o.id.toLowerCase() === target.toLowerCase() ||
                o.name.toLowerCase().includes(target.toLowerCase())
            ) || OUTLETS[0]
          : target;

      if (typeof window !== 'undefined') {
        localStorage.setItem('bizbox_pos_outlet', outlet.code);
      }

      set((state) => ({
        activeOutlet: outlet,
        order: {
          ...state.order,
          outletId: outlet.code,
        },
      }));
    },

  setOrderChannel: (channel) => {
    set((state) => {
      let table = state.selectedTable;
      let customer = state.selectedCustomer;
      let sType: OrderType = state.serviceType;

      if (channel === 'swiggy') {
        table = { id: 'swiggy', label: 'Swiggy', guests: 1 };
        customer = { name: 'Swiggy Order', phone: '98765 00001', points: 0 };
        sType = 'delivery';
      } else if (channel === 'zomato') {
        table = { id: 'zomato', label: 'Zomato', guests: 1 };
        customer = { name: 'Zomato Order', phone: '98765 00002', points: 0 };
        sType = 'delivery';
      } else if (channel === 'ondc') {
        table = { id: 'ondc', label: 'ONDC', guests: 1 };
        customer = { name: 'ONDC Order', phone: '98765 00003', points: 0 };
        sType = 'delivery';
      } else {
        table = { id: 'eeeeeeee-0000-0000-0000-000000000001', label: 'T1', guests: 2 };
        customer = { name: 'Walk-in Guest', phone: '—', points: 0 };
        sType = 'dine_in';
      }

      return {
        orderChannel: channel,
        serviceType: sType,
        selectedTable: table,
        selectedCustomer: customer,
        order: {
          ...state.order,
          channel,
          type: sType,
          tableId: table?.id,
          tableName: table?.label,
        },
      };
    });
  },

  setServiceType: (type) => {
    set((state) => ({
      serviceType: type,
      order: { ...state.order, type },
    }));
  },

  setTable: (table) => {
    set((state) => ({
      selectedTable: table,
      order: {
        ...state.order,
        tableId: table?.id,
        tableName: table?.label,
        covers: table?.guests,
      },
    }));
  },

  setCustomer: (customer) => {
    set((state) => ({
      selectedCustomer: customer,
      order: {
        ...state.order,
        customerName: customer?.name,
        customerPhone: customer?.phone,
        customerLoyaltyPoints: customer?.points,
      },
    }));
  },

  addItem: (item, variant, modifiers = [], notes = '') => {
    const { order, appliedDiscount } = get();
    const existingIndex = order.items.findIndex(
      (i) =>
        i.variantId === variant.id &&
        JSON.stringify(i.modifiers) === JSON.stringify(modifiers) &&
        i.notes === notes &&
        !i.kotId
    );

    let updatedItems = [...order.items];

    if (existingIndex > -1) {
      const existing = updatedItems[existingIndex];
      const newQty = existing.qty + 1;
      const mathResult = calculateLineItemTotal(
        existing.unitPrice,
        newQty,
        modifiers.map((m) => ({ priceDelta: m.priceDelta, qty: m.qty })),
        0,
        5
      );
      updatedItems[existingIndex] = {
        ...existing,
        qty: newQty,
        ...mathResult,
      };
    } else {
      const lineMath = calculateLineItemTotal(
        variant.price,
        1,
        modifiers.map((m) => ({ priceDelta: m.priceDelta, qty: m.qty })),
        0,
        5
      );

      const newItem: CartLineItem = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `item_${Date.now()}_${Math.random()}`,
        variantId: variant.id,
        itemName: item.name,
        variantName: variant.name,
        hsnSac: item.hsnSac,
        unitPrice: variant.price,
        qty: 1,
        modifiers,
        notes,
        taxRate: 5,
        ...lineMath,
      };
      updatedItems.push(newItem);
    }

    const totals = computeOrderTotals(
      updatedItems,
      mockTaxProfile,
      appliedDiscount?.percent || 0
    );

    const updatedOrder: ActiveOrder = {
      ...order,
      items: updatedItems,
      totals,
      updatedAt: new Date().toISOString(),
    };

    set({ order: updatedOrder });

    // Save locally to Dexie (IndexedDB)
    if (typeof window !== 'undefined' && db.orders) {
      db.orders.put(updatedOrder).catch(console.error);
    }
  },

  updateItemQty: (itemId, delta) => {
    const { order, appliedDiscount } = get();
    const updatedItems = order.items
      .map((item) => {
        if (item.id !== itemId) return item;
        const newQty = item.qty + delta;
        if (newQty <= 0) return null;
        const mathResult = calculateLineItemTotal(
          item.unitPrice,
          newQty,
          item.modifiers.map((m) => ({ priceDelta: m.priceDelta, qty: m.qty })),
          0,
          5
        );
        return {
          ...item,
          qty: newQty,
          ...mathResult,
        };
      })
      .filter(Boolean) as CartLineItem[];

    const totals = computeOrderTotals(
      updatedItems,
      mockTaxProfile,
      appliedDiscount?.percent || 0
    );

    const updatedOrder = {
      ...order,
      items: updatedItems,
      totals,
      updatedAt: new Date().toISOString(),
    };

    set({ order: updatedOrder });

    if (typeof window !== 'undefined' && db.orders) {
      db.orders.put(updatedOrder).catch(console.error);
    }
  },

  removeItem: (itemId) => {
    const { order, appliedDiscount } = get();
    const updatedItems = order.items.filter((i) => i.id !== itemId);
    const totals = computeOrderTotals(
      updatedItems,
      mockTaxProfile,
      appliedDiscount?.percent || 0
    );
    const updatedOrder = {
      ...order,
      items: updatedItems,
      totals,
      updatedAt: new Date().toISOString(),
    };
    set({ order: updatedOrder });
    if (typeof window !== 'undefined' && db.orders) {
      db.orders.put(updatedOrder).catch(console.error);
    }
  },

  applyDiscount: (code, percent) => {
    const { order } = get();
    const totals = computeOrderTotals(order.items, mockTaxProfile, percent);
    set({
      appliedDiscount: { code, percent },
      order: {
        ...order,
        discountCode: code,
        discountPercent: percent,
        totals,
      },
    });
  },

  removeDiscount: () => {
    const { order } = get();
    const totals = computeOrderTotals(order.items, mockTaxProfile, 0);
    set({
      appliedDiscount: null,
      order: {
        ...order,
        discountCode: undefined,
        discountPercent: 0,
        totals,
      },
    });
  },

  fireKOT: async () => {
    const { order, selectedCustomer, selectedTable, orderChannel, activeOutlet } = get();
    if (!order.items.length) return;

    const outletCode = activeOutlet?.code || 'BLR01';
    const kotId = `kot_${Date.now()}`;
    const itemsMarked = order.items.map((i) => ({ ...i, kotId }));
    const updatedOrder = { ...order, outletId: outletCode, items: itemsMarked };

    set({ order: updatedOrder });

    // 1. Sync live to Backend API (POST /v1/orders with fire: true)
    try {
      await fetch(`${getApiBaseUrl()}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: order.type || 'dine_in',
          channel: orderChannel || order.channel || 'pos',
          outletId: outletCode,
          outletCode: outletCode,
          tableId: selectedTable?.id,
          tableLabel: selectedTable?.label,
          covers: selectedTable?.guests || 2,
          customerId: selectedCustomer?.id,
          customerName: selectedCustomer?.name,
          customerPhone: selectedCustomer?.phone,
          items: order.items.map((it) => ({
            variantId: it.variantId || 'aaaaaaaa-0000-0000-0000-000000000001',
            name: it.variantName ? `${it.itemName} (${it.variantName})` : it.itemName,
            qty: it.qty,
            unitPrice: it.unitPrice,
            notes: it.notes,
          })),
          fire: true,
        }),
      });
    } catch (apiErr) {
      console.warn('API sync deferred to offline outbox:', apiErr);
    }

    // 2. Save locally to IndexedDB & Outbox & localStorage for instant KDS/Token reactive updates
    if (typeof window !== 'undefined') {
      try {
        const liveKot = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `kot_${Date.now()}`,
          kotNo: `KOT-${Date.now().toString().slice(-4)}`,
          orderNo: order.orderNo,
          tableLabel: selectedTable?.label || 'T1',
          outletCode,
          status: 'new',
          firedAt: new Date().toISOString(),
          items: order.items.map((it) => ({
            name: it.variantName ? `${it.itemName} (${it.variantName})` : it.itemName,
            qty: it.qty,
            notes: it.notes,
          })),
        };
        const rawExisting = localStorage.getItem('bizbox_live_kots');
        const existingList = rawExisting ? JSON.parse(rawExisting) : [];
        const merged = [liveKot, ...existingList.filter((k: any) => k.id !== liveKot.id)].slice(0, 50);
        localStorage.setItem('bizbox_live_kots', JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent('bizbox_kot_fired', { detail: liveKot }));
      } catch (storageErr) {
        console.warn('Local KDS storage sync warning:', storageErr);
      }

      if (db.orders) {
        await db.orders.put(updatedOrder);
        await syncEngine.queueEvent('kot', 'create', {
          orderId: order.id,
          kotId,
          items: itemsMarked,
        });
        syncEngine.kick();
      }
    }
  },

  settleBill: async (paymentMode) => {
    const { order, selectedCustomer, selectedTable, orderChannel, activeOutlet } = get();
    const outletCode = activeOutlet?.code || 'BLR01';
    const invoiceNo = `${outletCode}-${orderChannel === 'swiggy' ? 'SW' : orderChannel === 'zomato' ? 'ZM' : 'T2'}-${String(Math.floor(100000 + Math.random() * 900000)).slice(-6)}`;
    const settledOrder: ActiveOrder = {
      ...order,
      outletId: outletCode,
      status: 'billed',
    };

    // 1. Settle to live Backend API
    try {
      await fetch(`${getApiBaseUrl()}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: order.type || 'dine_in',
          channel: orderChannel || order.channel || 'pos',
          outletId: outletCode,
          outletCode: outletCode,
          tableId: selectedTable?.id,
          tableLabel: selectedTable?.label,
          covers: selectedTable?.guests || 2,
          customerId: selectedCustomer?.id,
          customerName: selectedCustomer?.name,
          customerPhone: selectedCustomer?.phone,
          paymentMode,
          items: order.items.map((it) => ({
            variantId: it.variantId || 'aaaaaaaa-0000-0000-0000-000000000001',
            name: it.variantName ? `${it.itemName} (${it.variantName})` : it.itemName,
            qty: it.qty,
            unitPrice: it.unitPrice,
            notes: it.notes,
          })),
          fire: false,
        }),
      });
    } catch (apiErr) {
      console.warn('API settle deferred to offline outbox:', apiErr);
    }

    // 2. Save locally in IndexedDB & localStorage for real-time reactivity
    if (typeof window !== 'undefined') {
      try {
        const settledEntry = {
          id: order.id,
          orderNo: order.orderNo,
          invoiceNo,
          channel: orderChannel || order.channel || 'pos',
          tableOrToken: selectedTable?.label ? `Table ${selectedTable.label}` : 'Counter',
          customerName: selectedCustomer?.name || 'Walk-in Guest',
          phone: selectedCustomer?.phone || '—',
          itemsCount: order.items.reduce((s, it) => s + it.qty, 0),
          itemsSummary: order.items.map((it) => `${it.qty}x ${it.itemName}`).join(', '),
          subtotal: order.totals.subtotal,
          gstTotal: (order.totals.cgst + order.totals.sgst),
          grandTotal: order.totals.grandTotal,
          paymentMode,
          status: 'settled',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          settledAt: new Date().toISOString(),
        };
        const rawOrders = localStorage.getItem('bizbox_settled_orders');
        const existingOrders = rawOrders ? JSON.parse(rawOrders) : [];
        const updatedOrders = [settledEntry, ...existingOrders.filter((o: any) => o.orderNo !== order.orderNo)].slice(0, 50);
        localStorage.setItem('bizbox_settled_orders', JSON.stringify(updatedOrders));
        window.dispatchEvent(new CustomEvent('bizbox_order_settled', { detail: settledEntry }));
      } catch (storageErr) {
        console.warn('Local settled orders cache warning:', storageErr);
      }

      if (db.orders) {
        await db.orders.put(settledOrder);
        await syncEngine.queueEvent('order', 'upsert', settledOrder);
        await syncEngine.queueEvent('payment', 'create', {
          orderId: order.id,
          invoiceNo,
          amount: order.totals.grandTotal,
          mode: paymentMode,
        });
        syncEngine.kick();
      }
    }

    return { invoiceNo, grandTotal: order.totals.grandTotal };
  },

  clearCart: () => {
    const { activeOutlet } = get();
    set({
      order: createInitialOrder(activeOutlet?.code || 'BLR01'),
      appliedDiscount: null,
      selectedCustomer: { name: 'Walk-in Guest', phone: '—', points: 0 },
    });
  },
};
});

