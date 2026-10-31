import Dexie, { Table } from 'dexie';
import { ActiveOrder, DiningTable, CustomerSummary, MenuItem, MenuCategory } from '@bizbox/pos-core';

export interface MenuSnapshot {
  outletId: string;
  configVersion: number;
  categories: MenuCategory[];
  items: MenuItem[];
  updatedAt: string;
}

export interface SyncEvent {
  seq?: number;
  eventId: string;
  entity: 'order' | 'kot' | 'payment' | 'table' | 'shift';
  op: 'create' | 'upsert' | 'delete';
  payload: any;
  occurredAt: string;
}

export class PosDB extends Dexie {
  menu!: Table<MenuSnapshot, string>;
  orders!: Table<ActiveOrder, string>;
  outbox!: Table<SyncEvent, number>;
  diningTables!: Table<DiningTable, string>;
  customers!: Table<CustomerSummary, string>;
  meta!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('bizbox-pos');
    this.version(1).stores({
      menu: 'outletId',
      orders: 'id, status, tableId, updatedAt',
      outbox: '++seq, eventId, entity',
      diningTables: 'id, status',
      customers: 'id, phone',
      meta: 'key',
    });
  }
}

export const db = typeof window !== 'undefined' ? new PosDB() : ({} as PosDB);

