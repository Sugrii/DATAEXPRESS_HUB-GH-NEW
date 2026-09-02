import { fetchHubtelRetryQueue, triggerProcessRetryQueueNow } from './apiClient';
import { updateOrderStatusAndRetry } from './firestoreService';
import { HubtelRetryQueueItem, TelecomOrder } from '../types';

/**
 * Client-Side Background Sync Manager
 * Automatically synchronizes background Hubtel retry and failover outcomes
 * with the Firestore global orders and sub-merchant sub-collections.
 */
class HubtelRetryBackgroundSync {
  private syncTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private syncIntervalMs: number = 6000;
  private listeners: Set<(queue: HubtelRetryQueueItem[]) => void> = new Set();
  private lastProcessedQueue: Map<string, string> = new Map();

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.poll();
    this.syncTimer = setInterval(() => this.poll(), this.syncIntervalMs);
  }

  public stop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    this.isRunning = false;
  }

  public subscribe(callback: (queue: HubtelRetryQueueItem[]) => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private async poll() {
    try {
      const data = await fetchHubtelRetryQueue();
      const queue: HubtelRetryQueueItem[] = data.queue || [];

      // Notify all registered UI listeners
      this.listeners.forEach((listener) => listener(queue));

      // Sync resolved retry items with Firestore
      for (const item of queue) {
        const previousStatus = this.lastProcessedQueue.get(item.orderId);
        
        if (item.status === 'RESOLVED' && previousStatus !== 'RESOLVED') {
          // Update Firestore order record to DELIVERED with Hubtel transaction metadata
          await updateOrderStatusAndRetry(item.orderId, {
            deliveryStatus: 'DELIVERED',
            retryStatus: 'RESOLVED',
            deliveryMessage: `Auto-delivered via Failover Route (${item.currentRoute}) after ${item.retryCount} retries.`,
            hubtelTransactionId: `HUB-FAILOVER-${Date.now().toString().slice(-8)}`,
            currentRoute: item.currentRoute,
            retryCount: item.retryCount,
            lastRetryAt: item.lastAttemptAt || new Date().toISOString(),
            retryHistory: item.history,
            agentId: item.agentId,
          });
        } else if (item.status === 'RE_ROUTED' && previousStatus !== 'RE_ROUTED') {
          await updateOrderStatusAndRetry(item.orderId, {
            retryStatus: 'RE_ROUTED',
            currentRoute: item.currentRoute,
            retryCount: item.retryCount,
            lastRetryAt: item.lastAttemptAt || new Date().toISOString(),
            retryHistory: item.history,
            agentId: item.agentId,
          });
        }

        this.lastProcessedQueue.set(item.orderId, item.status);
      }
    } catch (err) {
      console.warn('Hubtel background sync poll error:', err);
    }
  }
}

export const retryBackgroundSync = new HubtelRetryBackgroundSync();
