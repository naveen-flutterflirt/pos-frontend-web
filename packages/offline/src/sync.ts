import { db, SyncEvent } from './db';

export class SyncEngine {
  private isSyncing = false;
  private syncListeners: ((status: 'idle' | 'syncing' | 'error', pendingCount: number) => void)[] = [];

  public subscribe(listener: (status: 'idle' | 'syncing' | 'error', pendingCount: number) => void) {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  private notify(status: 'idle' | 'syncing' | 'error', pendingCount: number) {
    this.syncListeners.forEach(l => l(status, pendingCount));
  }

  public async getPendingCount(): Promise<number> {
    if (typeof window === 'undefined' || !db.outbox) return 0;
    try {
      return await db.outbox.count();
    } catch {
      return 0;
    }
  }

  public async queueEvent(entity: SyncEvent['entity'], op: SyncEvent['op'], payload: any): Promise<void> {
    if (typeof window === 'undefined' || !db.outbox) return;
    const eventId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `evt_${Date.now()}`;
    await db.outbox.add({
      eventId,
      entity,
      op,
      payload,
      occurredAt: new Date().toISOString(),
    });
    const count = await this.getPendingCount();
    this.notify('idle', count);
  }

  public async kick(): Promise<void> {
    if (this.isSyncing || typeof window === 'undefined' || !navigator.onLine) {
      return;
    }

    try {
      this.isSyncing = true;
      const count = await this.getPendingCount();
      this.notify('syncing', count);

      // In real backend connection, POST /sync/push in batches
      // Simulated online drain
      const events = await db.outbox.limit(20).toArray();
      if (events.length > 0) {
        const ids = events.map(e => e.seq!).filter(Boolean);
        await db.outbox.bulkDelete(ids);
      }

      const remaining = await this.getPendingCount();
      this.notify('idle', remaining);
    } catch (err) {
      const remaining = await this.getPendingCount();
      this.notify('error', remaining);
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncEngine = new SyncEngine();

