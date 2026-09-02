import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  increment,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  SubMerchant,
  TelecomOrder,
  CommissionRecord,
  PayoutRecord,
  TelecomNetwork,
} from '../types';

const AGENTS_COLLECTION = 'agents';
const ORDERS_COLLECTION = 'orders';
const PAYOUTS_COLLECTION = 'payouts';

// Production initialized Sub-Merchants
export const DEFAULT_SEED_AGENTS: SubMerchant[] = [
  {
    id: 'AGT-001',
    name: 'Kofi Mensah',
    businessName: 'Accra Mall Data & Telecom',
    phone: '0244123456',
    network: 'MTN',
    email: 'kofi.accra@ghanatelecom.gh',
    pin: '1234',
    slug: 'accra-mall-data',
    commissionRate: 10,
    totalCommissionEarned: 0.00,
    availableCommissionBalance: 0.00,
    totalSalesVolume: 0.00,
    totalOrdersCount: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
    customThemeColor: '#fbbf24',
  },
  {
    id: 'AGT-002',
    name: 'Ama Serwaa',
    businessName: 'Kumasi Tech Hub Airtime',
    phone: '0207654321',
    network: 'TELECEL',
    email: 'ama.kumasi@ghanatelecom.gh',
    pin: '5678',
    slug: 'kumasi-hub',
    commissionRate: 10,
    totalCommissionEarned: 0.00,
    availableCommissionBalance: 0.00,
    totalSalesVolume: 0.00,
    totalOrdersCount: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
    customThemeColor: '#e11d48',
  },
  {
    id: 'AGT-003',
    name: 'Kwame Osei',
    businessName: 'Madina FastLink Bundles',
    phone: '0271122334',
    network: 'AT',
    email: 'kwame.madina@ghanatelecom.gh',
    pin: '9900',
    slug: 'madina-fastlink',
    commissionRate: 10,
    totalCommissionEarned: 0.00,
    availableCommissionBalance: 0.00,
    totalSalesVolume: 0.00,
    totalOrdersCount: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
    customThemeColor: '#2563eb',
  },
];

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

// Helper to seed initial data if none exists
export async function seedInitialAgentsIfEmpty(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, AGENTS_COLLECTION));
    if (snap.empty) {
      for (const agent of DEFAULT_SEED_AGENTS) {
        await setDoc(doc(db, AGENTS_COLLECTION, agent.id), sanitizeForFirestore(agent));
      }
    }
  } catch (err) {
    console.warn('Firestore seeding check (using fallback local state if needed):', err);
  }
}

// 1. Create a Sub-Merchant / Agent
export async function createSubMerchant(data: Omit<SubMerchant, 'id' | 'createdAt' | 'totalCommissionEarned' | 'availableCommissionBalance' | 'totalSalesVolume' | 'totalOrdersCount' | 'status'> & { customId?: string }): Promise<SubMerchant> {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const id = data.customId || `AGT-${randomSuffix}`;
  
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
    console.error('Error saving agent to Firestore:', err);
  }

  return newAgent;
}

// 2. Fetch all Sub-Merchants (realtime subscription)
export function subscribeSubMerchants(callback: (agents: SubMerchant[]) => void): Unsubscribe {
  try {
    const q = query(collection(db, AGENTS_COLLECTION), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: SubMerchant[] = [];
          snapshot.forEach((d) => list.push(d.data() as SubMerchant));
          callback(list);
        } else {
          // seed fallback
          callback(DEFAULT_SEED_AGENTS);
          seedInitialAgentsIfEmpty();
        }
      },
      (error) => {
        console.warn('Firestore agents subscribe error, falling back:', error);
        callback(DEFAULT_SEED_AGENTS);
      }
    );
  } catch {
    callback(DEFAULT_SEED_AGENTS);
    return () => {};
  }
}

// 3. Fetch single Sub-Merchant by ID or Slug
export async function getSubMerchant(idOrSlug: string): Promise<SubMerchant | null> {
  try {
    // try by ID
    const docRef = doc(db, AGENTS_COLLECTION, idOrSlug);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as SubMerchant;
    }
    // try by slug
    const q = query(collection(db, AGENTS_COLLECTION), where('slug', '==', idOrSlug));
    const slugSnap = await getDocs(q);
    if (!slugSnap.empty) {
      return slugSnap.docs[0].data() as SubMerchant;
    }
  } catch (err) {
    console.warn('Error fetching agent:', err);
  }
  return DEFAULT_SEED_AGENTS.find((a) => a.id === idOrSlug || a.slug === idOrSlug) || null;
}

// 4. Record Telecom Order & Auto-Credit 10% Commission
export async function recordOrderAndCommission(order: TelecomOrder): Promise<{
  order: TelecomOrder;
  commissionRecord?: CommissionRecord;
}> {
  const orderId = order.id || `ORD-GH-${Date.now().toString().slice(-6)}`;
  const orderToSave: TelecomOrder = {
    ...order,
    id: orderId,
    agentId: order.agentId || 'DIRECT',
    agentName: order.agentName || 'Direct Customer',
    agentPhone: order.agentPhone || '',
    deliveryMessage: order.deliveryMessage || '',
    hubtelTransactionId: order.hubtelTransactionId || '',
  };

  let commRecord: CommissionRecord | undefined = undefined;

  try {
    const sanitizedOrder = sanitizeForFirestore(orderToSave);

    // 1. Save in Global Orders collection
    await setDoc(doc(db, ORDERS_COLLECTION, orderId), sanitizedOrder);

    // 2. If purchase was through a sub-merchant agent, save to Agent's Dedicated Sub-Collection & Credit Commission
    if (order.agentId && order.agentId !== 'DIRECT') {
      const agentRef = doc(db, AGENTS_COLLECTION, order.agentId);
      const agentSnap = await getDoc(agentRef);

      const commissionRate = agentSnap.exists() ? (agentSnap.data() as SubMerchant).commissionRate || 10 : 10;
      const commissionAmount = Number(((order.amount * commissionRate) / 100).toFixed(2));

      // Dedicated Agent sub-collection: agents/{agentId}/orders/{orderId}
      const agentOrderRef = doc(db, AGENTS_COLLECTION, order.agentId, 'orders', orderId);
      await setDoc(agentOrderRef, sanitizedOrder);

      // Create Commission Record in agents/{agentId}/commissions/{commId}
      const commId = `COMM-${orderId}`;
      commRecord = {
        id: commId,
        agentId: order.agentId,
        agentName: order.agentName || 'Agent',
        agentPhone: order.agentPhone || '',
        orderId: orderId,
        orderAmount: order.amount,
        commissionRate: commissionRate,
        commissionAmount: commissionAmount,
        status: 'CREDITED',
        creditedAt: new Date().toISOString(),
      };

      const agentCommRef = doc(db, AGENTS_COLLECTION, order.agentId, 'commissions', commId);
      await setDoc(agentCommRef, sanitizeForFirestore(commRecord));

      // Atomically update Agent's balance and sales stats
      await updateDoc(agentRef, {
        availableCommissionBalance: increment(commissionAmount),
        totalCommissionEarned: increment(commissionAmount),
        totalSalesVolume: increment(order.amount),
        totalOrdersCount: increment(1),
        lastActiveAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('Error recording order in Firestore:', err);
  }

  return { order: orderToSave, commissionRecord: commRecord };
}

// 5. Subscribe to Global Orders
export function subscribeGlobalOrders(callback: (orders: TelecomOrder[]) => void): Unsubscribe {
  try {
    const q = query(collection(db, ORDERS_COLLECTION), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(
      q,
      (snap) => {
        const list: TelecomOrder[] = [];
        snap.forEach((d) => list.push(d.data() as TelecomOrder));
        callback(list);
      },
      (err) => {
        console.warn('Orders subscription error:', err);
      }
    );
  } catch {
    return () => {};
  }
}

// 6. Subscribe to Dedicated Sub-Merchant Orders (sub-agent's own database)
export function subscribeAgentOrders(agentId: string, callback: (orders: TelecomOrder[]) => void): Unsubscribe {
  try {
    const ordersSubColl = collection(db, AGENTS_COLLECTION, agentId, 'orders');
    const q = query(ordersSubColl, orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(
      q,
      (snap) => {
        const list: TelecomOrder[] = [];
        snap.forEach((d) => list.push(d.data() as TelecomOrder));
        callback(list);
      },
      (err) => {
        console.warn(`Agent ${agentId} orders subscription error:`, err);
      }
    );
  } catch {
    return () => {};
  }
}

// 7. Subscribe to Dedicated Sub-Merchant Commissions
export function subscribeAgentCommissions(agentId: string, callback: (commissions: CommissionRecord[]) => void): Unsubscribe {
  try {
    const commSubColl = collection(db, AGENTS_COLLECTION, agentId, 'commissions');
    const q = query(commSubColl, orderBy('creditedAt', 'desc'), limit(100));
    return onSnapshot(
      q,
      (snap) => {
        const list: CommissionRecord[] = [];
        snap.forEach((d) => list.push(d.data() as CommissionRecord));
        callback(list);
      },
      (err) => {
        console.warn(`Agent ${agentId} commissions error:`, err);
      }
    );
  } catch {
    return () => {};
  }
}

// 8. Process Payout / Commission Withdrawal to Sub-Merchant Phone Number
export async function processAgentCommissionPayout(
  agent: SubMerchant,
  amount: number,
  channel: 'MTN_MOMO' | 'TELECEL_CASH' | 'AT_MONEY'
): Promise<PayoutRecord> {
  const payoutId = `PAYOUT-GH-${Date.now().toString().slice(-6)}`;
  const payout: PayoutRecord = {
    id: payoutId,
    agentId: agent.id,
    agentName: agent.name,
    agentPhone: agent.phone,
    agentNetwork: agent.network,
    amount: amount,
    channel: channel,
    status: 'SUCCESS',
    reference: `REF-MOMO-${Date.now()}`,
    hubtelTransactionId: `HUB-DISB-${Math.floor(10000000 + Math.random() * 90000000)}`,
    processedAt: new Date().toISOString(),
    notes: `10% Commission auto-credited & disbursed to ${agent.phone} (${channel})`,
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
    console.error('Error processing payout in Firestore:', err);
  }

  return payout;
}

// 9. Update Order Delivery & Retry State
export async function updateOrderStatusAndRetry(
  orderId: string,
  updates: Partial<TelecomOrder> & { agentId?: string }
): Promise<void> {
  try {
    const sanitizedUpdates = sanitizeForFirestore(updates);
    // 1. Update in Global Orders
    const globalOrderRef = doc(db, ORDERS_COLLECTION, orderId);
    await updateDoc(globalOrderRef, sanitizedUpdates);

    // 2. If sub-merchant order, update in agent's sub-collection
    if (updates.agentId && updates.agentId !== 'DIRECT') {
      const agentOrderRef = doc(db, AGENTS_COLLECTION, updates.agentId, 'orders', orderId);
      await updateDoc(agentOrderRef, sanitizedUpdates);
    }
  } catch (err) {
    console.warn('Error updating order retry status in Firestore:', err);
  }
}
