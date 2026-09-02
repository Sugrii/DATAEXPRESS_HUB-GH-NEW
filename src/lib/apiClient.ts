import {
  ApiSecurityConfig,
  NetworkHealth,
  SubMerchant,
  TelecomNetwork,
  TelecomOrder,
} from '../types';

async function unpackSafeJson(res: Response, defaultError: string): Promise<any> {
  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (!res.ok) {
    const errorMsg = (data && (data.error || data.message)) || defaultError || `Server error (HTTP ${res.status})`;
    throw new Error(errorMsg);
  }
  return data !== null ? data : { raw: text };
}

export async function fetchSystemConfig(): Promise<ApiSecurityConfig> {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Config fetch error:', err);
  }
  return {
    paystackSecretKeySet: false,
    paystackPublicKey: 'pk_test_gh_telecom_demo_key',
    hubtelClientIdSet: false,
    hubtelClientSecretSet: false,
    hubtelMerchantAccountNumber: '2010892',
    adminSecretKeySet: true,
    defaultCommissionRate: 10,
    mode: 'SANDBOX',
  };
}

export async function fetchNetworkHealth(): Promise<{
  networks: NetworkHealth[];
  gateways: Record<string, { status: string; latencyMs: number; route: string }>;
}> {
  try {
    const res = await fetch('/api/network-status');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Network health fetch error:', err);
  }
  return {
    networks: [
      { network: 'MTN', name: 'MTN Ghana', status: 'ONLINE', latencyMs: 45, successRate: 99.8, lastUpdated: new Date().toISOString() },
      { network: 'TELECEL', name: 'Telecel Ghana', status: 'ONLINE', latencyMs: 52, successRate: 99.4, lastUpdated: new Date().toISOString() },
      { network: 'AT', name: 'AT Ghana', status: 'ONLINE', latencyMs: 61, successRate: 98.9, lastUpdated: new Date().toISOString() },
    ],
    gateways: {
      hubtel: { status: 'ONLINE', latencyMs: 40, route: 'Direct Telco SMPP/USSD' },
      paystack: { status: 'ONLINE', latencyMs: 48, route: 'Ghana MoMo Gateway' },
    },
  };
}

export async function initializePaystackPayment(params: {
  amount: number;
  email?: string;
  customerPhone: string;
  network: TelecomNetwork;
  packageId: string;
  packageName: string;
  agentId?: string;
  agentName?: string;
}) {
  const res = await fetch('/api/paystack/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return await unpackSafeJson(res, 'Failed to initialize Paystack checkout');
}

export async function verifyPaystackPayment(reference: string) {
  const res = await fetch(`/api/paystack/verify/${reference}`);
  return await unpackSafeJson(res, 'Failed to verify payment');
}

export async function routeHubtelDelivery(params: {
  recipientPhone: string;
  network: TelecomNetwork;
  amount: number;
  packageId: string;
  packageName: string;
  dataAmount: string;
  productType: string;
  agentId?: string;
}) {
  const res = await fetch('/api/hubtel/topup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return await unpackSafeJson(res, 'Failed to route bundle through Hubtel');
}

export async function verifyHubtelNode(): Promise<import('../types').HubtelNodeVerificationResult> {
  const res = await fetch('/api/hubtel/verify-node', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return await unpackSafeJson(res, 'Failed to verify Hubtel Telco Routing Node');
}

export async function disburseCommissionPayout(params: {
  agentId: string;
  agentName: string;
  agentPhone: string;
  agentNetwork: TelecomNetwork;
  amount: number;
}) {
  const res = await fetch('/api/commission/disburse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return await unpackSafeJson(res, 'Failed to disburse commission to phone number');
}

// -------------------------------------------------------------
// Hubtel Auto-Retry & Re-Routing Background Service Client APIs
// -------------------------------------------------------------

export async function fetchHubtelRetryQueue() {
  try {
    const res = await fetch('/api/hubtel/retry-queue');
    if (res.ok) {
      return await unpackSafeJson(res, 'Failed to fetch retry queue');
    }
  } catch (err) {
    console.warn('Error fetching retry queue:', err);
  }
  return {
    isWorkerRunning: true,
    activeQueueLength: 0,
    totalQueueItems: 0,
    totalRetriedCount: 0,
    successAfterRetryCount: 0,
    reRoutedCount: 0,
    permanentFailuresCount: 0,
    lastWorkerRunAt: new Date().toISOString(),
    retryIntervalSeconds: 8,
    routes: [],
    queue: [],
  };
}

export async function enqueueFailedOrder(params: {
  orderId: string;
  customerPhone: string;
  network: TelecomNetwork;
  amount: number;
  packageName: string;
  dataAmount: string;
  failureReason: string;
  agentId?: string;
  agentName?: string;
}) {
  const res = await fetch('/api/hubtel/retry-queue/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return await unpackSafeJson(res, 'Failed to enqueue retry item');
}

export async function triggerProcessRetryQueueNow() {
  const res = await fetch('/api/hubtel/retry-queue/process-now', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return await unpackSafeJson(res, 'Failed to trigger retry queue');
}

export async function manualRetryOrder(
  orderId: string,
  targetRoute?: string,
  extraData?: {
    customerPhone?: string;
    network?: TelecomNetwork;
    amount?: number;
    packageName?: string;
    dataAmount?: string;
  }
) {
  const res = await fetch(`/api/hubtel/retry-queue/manual-retry/${orderId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetRoute, ...extraData }),
  });
  return await unpackSafeJson(res, 'Manual retry failed');
}

export async function simulateFailedHubtelPurchase(params?: {
  network?: TelecomNetwork;
  amount?: number;
  packageName?: string;
  dataAmount?: string;
  customerPhone?: string;
  agentId?: string;
  agentName?: string;
}) {
  const res = await fetch('/api/hubtel/retry-queue/simulate-failure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params || {}),
  });
  return await unpackSafeJson(res, 'Failed to simulate purchase failure');
}

export async function updateRetryWorkerConfig(params: {
  isWorkerRunning?: boolean;
  retryInterval?: number;
}) {
  const res = await fetch('/api/hubtel/retry-queue/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return await unpackSafeJson(res, 'Failed to update retry worker config');
}

export async function clearResolvedRetryQueue() {
  const res = await fetch('/api/hubtel/retry-queue/clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return await unpackSafeJson(res, 'Failed to clear retry queue');
}

