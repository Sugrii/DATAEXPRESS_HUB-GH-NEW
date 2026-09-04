import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  increment,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { SubMerchant, TelecomOrder, CommissionRecord, PayoutRecord, TelecomNetwork } from '../types';

export const AGENTS_COLLECTION = 'agents';
export const ORDERS_COLLECTION = 'orders';
export const PAYOUTS_COLLECTION = 'payouts';

/**
 * Strips all undefined fields recursively from an object so Firestore setDoc/updateDoc never fails.
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// 1. Admin creates a new Sub-Merchant Agent
export async function createAgentByAdmin(data: {
  name: string;
  businessName: string;
  phone: string;
  email?: string;
  momoNumber?: string;
  momoNetwork?: TelecomNetwork;
  commissionRate?: number;
}): Promise<SubMerchant> {
  const id = `AGT-${Date.now().toString().slice(-6)}`;
  const newAgent: SubMerchant = {
    ...data,
    id,
    commissionRate: data.commissionRate ?? 10,
    totalCommissionEarned: 0,
    availableCommissionBalance: 0,
    totalSalesVolume: 0,
    totalOrdersCount: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, AGENTS_COLLECTION, id), sanitizeForFirestore(newAgent));
  } catch (err) {
    console.error('Error saving agent to Firestore by Admin:', err);
    throw err;
  }

  return newAgent;
}

// Alias for backwards compatibility
export const registerSubMerchant = createAgentByAdmin;

// 2. Fetch all Sub-Merchants (realtime subscription - Admin-created agents only)
export function subscribeSubMerchants(callback: (agents: SubMerchant[]) => void): Unsubscribe {
  try {
    const q = query(collection(db, AGENTS_COLLECTION));
    return onSnapshot(
      q,
      (snap) => {
        const agents: SubMerchant[] = snap.docs.map((d) => d.data() as SubMerchant);
        callback(agents);
      },
      (err) => {
        console.warn('Firestore agents listener fallback:', err);
        callback([]);
      }
    );
  } catch (e) {
    callback([]);
    return () => {};
  }
}

// 3. Record Telecom Order (customer purchases only)
export async function recordTelecomOrder(order: Omit<TelecomOrder, 'id'> & { id?: string }): Promise<TelecomOrder> {
  const orderId = order.id || `ORD-GH-${Date.now().toString().slice(-7)}`;
  const orderToSave: TelecomOrder = {
    ...order,
    id: orderId,
    agentId: order.agentId || 'DIRECT',
    agentName: order.agentName || 'Direct Customer',
    agentPhone: order.agentPhone || '',
    deliveryMessage: order.deliveryMessage || '',
    hubtelTransactionId: order.hubtelTransactionId || '',
  };

  try {
    const sanitizedOrder = sanitizeForFirestore(orderToSave);

    // 1. Save in Global Orders collection
    await setDoc(doc(db, ORDERS_COLLECTION, orderId), sanitizedOrder);

    // 2. If purchase was through an active sub-merchant agent, attribute commission
    if (order.agentId && order.agentId !== 'DIRECT') {
      const agentRef = doc(db, AGENTS_COLLECTION, order.agentId);

      // Dedicated Agent sub-collection: agents/{agentId}/orders/{orderId}
      const agentOrderRef = doc(db, AGENTS_COLLECTION, order.agentId, 'orders', orderId);
      await setDoc(agentOrderRef, sanitizedOrder);

      // Create Commission Record in agents/{agentId}/commissions/{commId}
      const commId = `COMM-${orderId}`;
      const commRecord: CommissionRecord = {
        id: commId,
        orderId,
        agentId: order.agentId,
        amountGhs: order.commissionGhs,
        orderTotalGhs: order.amountGhs,
        ratePercent: order.amountGhs > 0 ? Math.round((order.commissionGhs / order.amountGhs) * 100) : 10,
        createdAt: new Date().toISOString(),
      };

      const agentCommRef = doc(db, AGENTS_COLLECTION, order.agentId, 'commissions', commId);
      await setDoc(agentCommRef, sanitizeForFirestore(commRecord));

      // Atomically update Agent's balance and sales volume
      await updateDoc(agentRef, {
        totalCommissionEarned: increment(order.commissionGhs),
        availableCommissionBalance: increment(order.commissionGhs),
        totalSalesVolume: increment(order.amountGhs),
        totalOrdersCount: increment(1),
      });
    }
  } catch (err) {
    console.error('Error recording telecom order to Firestore:', err);
  }

  return orderToSave;
}

// 4. Subscribe to Realtime Orders (only authentic customer purchases)
export function subscribeOrders(callback: (orders: TelecomOrder[]) => void): Unsubscribe {
  try {
    const q = query(collection(db, ORDERS_COLLECTION), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(
      q,
      (snap) => {
        const orders: TelecomOrder[] = snap.docs.map((d) => d.data() as TelecomOrder);
        callback(orders);
      },
      (err) => {
        console.warn('Orders subscription fallback:', err);
        callback([]);
      }
    );
  } catch (e) {
    callback([]);
    return () => {};
  }
}

// 5. Subscribe to Agent's Dedicated Orders
export function subscribeAgentOrders(agentId: string, callback: (orders: TelecomOrder[]) => void): Unsubscribe {
  try {
    const q = query(
      collection(db, AGENTS_COLLECTION, agentId, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    return onSnapshot(
      q,
      (snap) => {
        const orders: TelecomOrder[] = snap.docs.map((d) => d.data() as TelecomOrder);
        callback(orders);
      },
      (err) => {
        console.warn('Agent orders fallback:', err);
        callback([]);
      }
    );
  } catch (e) {
    callback([]);
    return () => {};
  }
}

// 6. Record Payout Request
export async function recordPayoutRequest(
  agent: SubMerchant,
  amount: number,
  momoNumber: string,
  momoNetwork: TelecomNetwork
): Promise<PayoutRecord> {
  const payoutId = `PAYOUT-${Date.now().toString().slice(-6)}`;
  const payout: PayoutRecord = {
    id: payoutId,
    agentId: agent.id,
    amountGhs: amount,
    status: 'PAID',
    momoNumber,
    momoNetwork,
    requestedAt: new Date().toISOString(),
    processedAt: new Date().toISOString(),
  };

  try {
    const sanitizedPayout = sanitizeForFirestore(payout);
    // Save to Global Payouts
    await setDoc(doc(db, PAYOUTS_COLLECTION, payoutId), sanitizedPayout);

    // Save to Agent's dedicated Payouts sub-collection
    const agentPayoutRef = doc(db, AGENTS_COLLECTION, agent.id, 'payouts', payoutId);
    await setDoc(agentPayoutRef, sanitizedPayout);

    // Deduct availableCommissionBalance
    const agentRef = doc(db, AGENTS_COLLECTION, agent.id);
    await updateDoc(agentRef, {
      availableCommissionBalance: increment(-amount),
    });
  } catch (err) {
    console.error('Error recording payout request:', err);
  }

  return payout;
}

// 7. Subscribe to Global Payouts
export function subscribePayouts(callback: (payouts: PayoutRecord[]) => void): Unsubscribe {
  try {
    const q = query(collection(db, PAYOUTS_COLLECTION), orderBy('requestedAt', 'desc'), limit(50));
    return onSnapshot(
      q,
      (snap) => {
        const payouts: PayoutRecord[] = snap.docs.map((d) => d.data() as PayoutRecord);
        callback(payouts);
      },
      (err) => {
        console.warn('Payouts subscription error:', err);
        callback([]);
      }
    );
  } catch (e) {
    callback([]);
    return () => {};
  }
}

// 8. Update Order (e.g. For Retry Service)
export async function updateOrderDelivery(
  orderId: string,
  updates: Partial<TelecomOrder> & { agentId?: string }
): Promise<void> {
  try {
    const sanitizedUpdates = sanitizeForFirestore(updates);
    const globalOrderRef = doc(db, ORDERS_COLLECTION, orderId);
    await updateDoc(globalOrderRef, sanitizedUpdates);

    if (updates.agentId && updates.agentId !== 'DIRECT') {
      const agentOrderRef = doc(db, AGENTS_COLLECTION, updates.agentId, 'orders', orderId);
      await updateDoc(agentOrderRef, sanitizedUpdates);
    }
  } catch (err) {
    console.warn('Error updating order delivery status in Firestore:', err);
  }
}

// 9. Manual Refund in Firestore (Admin triggered for Paystack transactions)
export async function refundOrderInFirestore(
  orderId: string,
  refundDetails: {
    refundReference: string;
    amountGhs: number;
    reason?: string;
    adminEmail?: string;
    status: 'PROCESSED' | 'PENDING' | 'SIMULATED';
  },
  agentId?: string
): Promise<void> {
  try {
    const orderUpdates: Partial<TelecomOrder> = {
      paymentStatus: 'REFUNDED',
      deliveryStatus: 'FAILED',
      deliveryMessage: `Refunded via Paystack (Ref: ${refundDetails.refundReference}). ${refundDetails.reason || ''}`.trim(),
      refundDetails: {
        ...refundDetails,
        refundedAt: new Date().toISOString(),
      },
    };

    const sanitizedUpdates = sanitizeForFirestore(orderUpdates);
    const globalOrderRef = doc(db, ORDERS_COLLECTION, orderId);
    await updateDoc(globalOrderRef, sanitizedUpdates);

    if (agentId && agentId !== 'DIRECT') {
      try {
        const agentOrderRef = doc(db, AGENTS_COLLECTION, agentId, 'orders', orderId);
        await updateDoc(agentOrderRef, sanitizedUpdates);
      } catch (e) {
        // Continue if agent order sub-collection document does not exist
      }
    }
  } catch (err) {
    console.warn('Error recording refund in Firestore:', err);
    throw err;
  }
}
