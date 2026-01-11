import { SyncQueueItem } from '../domain/models';

const SYNC_TABLE = 'chronos_sync_queue';

export class LocalSyncRepository {
    private getQueue(): SyncQueueItem[] {
        const data = localStorage.getItem(SYNC_TABLE);
        return data ? JSON.parse(data) : [];
    }

    private saveQueue(items: SyncQueueItem[]) {
        localStorage.setItem(SYNC_TABLE, JSON.stringify(items));
    }

    addToQueue(
        entityType: SyncQueueItem['entityType'],
        entityId: string,
        operation: SyncQueueItem['operation'],
        payload: any
    ): void {
        const queue = this.getQueue();
        const item: SyncQueueItem = {
            id: crypto.randomUUID(),
            entityType,
            entityId,
            operation,
            payloadJson: JSON.stringify(payload),
            createdAt: Date.now(),
            status: 'PENDING'
        };
        queue.push(item);
        this.saveQueue(queue);
        console.log(`[Sync] Queued ${operation} for ${entityType} ${entityId}`);
    }

    getPendingItems(): SyncQueueItem[] {
        return this.getQueue().filter(i => i.status === 'PENDING');
    }

    markAsSynced(ids: string[]) {
        const queue = this.getQueue();
        const updated = queue.map(item => 
            ids.includes(item.id) ? { ...item, status: 'SYNCED' as const } : item
        );
        this.saveQueue(updated);
    }
}

export const SyncRepository = new LocalSyncRepository();
