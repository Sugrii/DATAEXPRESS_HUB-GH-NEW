export type TelecomNetwork = 'MTN' | 'TELECEL' | 'AT';

export type ProductType = 'DATA' | 'AIRTIME' | 'SPECIAL';

export interface BundlePackage {
  id: string;
  network: TelecomNetwork;
  name: string;
  category: 'NON_EXPIRY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SPECIAL' | 'TURBONET' | 'AIRTIME';
  dataAmount: string; // e.g. "2.5 GB", "10 GB", or "Flexi Airtime"
  price: number; // in GHS
  validity: string; // "No Expiry", "30 Days", "24 Hours"
  description: string;
  popular?: boolean;
  hubtelBundleId?: string;
  ussdCode?: string;
}

export interface SubMerchant {
  id: string; // e.g. "AGT-9021"
  name: string;
  businessName: string;
  phone: string; // Ghana Phone Number (for receiving 10% commissions)
  network: TelecomNetwork; // MoMo Network of the agent
  email: string;
  pin: string; // 4-digit agent access PIN
  slug: string; // unique storefront link slug, e.g. "kofi-bundles"
  commissionRate: number; // default 10 (10%)
  totalCommissionEarned: number; // GHS
  availableCommissionBalance: number; // GHS
  totalSalesVolume: number; // GHS
  totalOrdersCount: number;
  status: 'active' | 'suspended';
  createdAt: string;
  lastActiveAt?: string;
  customThemeColor?: string;
}

export interface CommissionRecord {
  id: string;
  agentId: string;
  agentName: string;
  agentPhone: string;
  orderId: string;
  orderAmount: number;
  commissionRate: number; // e.g. 10%
  commissionAmount: number; // in GHS
  status: 'CREDITED' | 'PAID_OUT' | 'PENDING';
  creditedAt: string;
  payoutReference?: string;
}

export interface PayoutRecord {
  id: string;
  agentId: string;
  agentName: string;
  agentPhone: string;
  agentNetwork: TelecomNetwork;
  amount: number; // GHS
  channel: 'MTN_MOMO' | 'TELECEL_CASH' | 'AT_MONEY';
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  reference: string;
  hubtelTransactionId?: string;
  processedAt: string;
  notes?: string;
}

export interface RetryAttemptRecord {
  attemptNumber: number;
  timestamp: string;
  route: string;
  gateway: string;
  status: 'SUCCESS' | 'FAILED' | 'RETRYING';
  errorMessage?: string;
  responseCode?: string;
  latencyMs?: number;
}

export type RetryStatus = 'IDLE' | 'QUEUED' | 'RETRYING' | 'RE_ROUTED' | 'RESOLVED' | 'FAILED_PERMANENT';

export interface TelecomOrder {
  id: string;
  agentId: string; // "DIRECT" or sub-merchant ID
  agentName: string;
  agentPhone?: string;
  customerPhone: string;
  network: TelecomNetwork;
  productType: ProductType;
  packageId: string;
  packageName: string;
  dataAmount: string;
  amount: number; // GHS paid by customer
  commissionAmount: number; // 10% credited to sub-merchant
  paymentMethod: 'PAYSTACK_MOMO' | 'PAYSTACK_CARD' | 'HUBTEL_DIRECT' | 'WALLET';
  paymentReference: string;
  paymentStatus: 'SUCCESS' | 'PENDING' | 'FAILED';
  routingGateway: 'HUBTEL' | 'DIRECT_TELCO_API';
  deliveryStatus: 'DELIVERED' | 'PROCESSING' | 'FAILED';
  deliveryMessage?: string;
  hubtelTransactionId?: string;
  createdAt: string;
  customerName?: string;
  customerEmail?: string;
  // Retry & Re-routing Background Engine fields
  retryStatus?: RetryStatus;
  retryCount?: number;
  maxRetries?: number;
  lastRetryAt?: string;
  nextRetryAt?: string;
  failureReason?: string;
  currentRoute?: string;
  retryHistory?: RetryAttemptRecord[];
  autoRetryEnabled?: boolean;
}

export interface HubtelRetryQueueItem {
  id: string;
  orderId: string;
  customerPhone: string;
  network: TelecomNetwork;
  amount: number;
  packageName: string;
  dataAmount: string;
  failureReason: string;
  retryCount: number;
  maxRetries: number;
  status: RetryStatus;
  currentRoute: string;
  enqueuedAt: string;
  lastAttemptAt?: string;
  nextAttemptAt?: string;
  history: RetryAttemptRecord[];
  agentId?: string;
  agentName?: string;
}

export interface FailoverRouteNode {
  id: string;
  name: string;
  priority: number;
  channel: string;
  status: 'ONLINE' | 'STANDBY' | 'DEGRADED';
  latencyMs: number;
  successRate: number;
  description: string;
}

export interface HubtelRetryServiceState {
  isWorkerRunning: boolean;
  activeQueueLength: number;
  totalRetriedCount: number;
  successAfterRetryCount: number;
  reRoutedCount: number;
  permanentFailuresCount: number;
  lastWorkerRunAt: string;
  retryIntervalSeconds: number;
  routes: FailoverRouteNode[];
}

export interface ApiSecurityConfig {
  paystackSecretKeySet: boolean;
  paystackPublicKey: string;
  hubtelClientIdSet: boolean;
  hubtelClientSecretSet: boolean;
  hubtelMerchantAccountNumber: string;
  adminSecretKeySet: boolean;
  defaultCommissionRate: number; // 10%
  mode: 'SANDBOX' | 'LIVE';
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: 'ADMIN' | 'AGENT' | 'CUSTOMER';
  agentId?: string; // If role is AGENT
}

export interface NetworkHealth {
  network: TelecomNetwork;
  name: string;
  status: 'ONLINE' | 'DEGRADED' | 'MAINTENANCE';
  latencyMs: number;
  successRate: number;
  lastUpdated: string;
}

export interface TransactionToast {
  id: string;
  order: TelecomOrder;
  type: 'COMMISSION_EARNED' | 'TRANSACTION_SUCCESS' | 'RETRY_RESOLVED';
  title: string;
  message: string;
  amount: number;
  commissionAmount: number;
  network: TelecomNetwork;
  customerPhone: string;
  packageName: string;
  dataAmount: string;
  agentId?: string;
  agentName?: string;
  timestamp: string;
  durationMs: number;
}

export interface HubtelNodeVerificationResult {
  verified: boolean;
  timestamp: string;
  mode: 'LIVE' | 'SANDBOX';
  hubtelTransactionId: string;
  message: string;
  healthScore: number;
  routingNode: string;
  credentialsStatus: {
    clientIdSet: boolean;
    clientSecretSet: boolean;
    merchantAccountNumber: string;
    authVerified: boolean;
  };
  latencyMs: number;
  routingNodes: Array<{
    id: string;
    name: string;
    tier: number;
    status: 'ONLINE' | 'STANDBY' | 'DEGRADED';
    latencyMs: number;
    successRate: number;
  }>;
  carrierHandshakes: Record<TelecomNetwork, {
    status: 'ACTIVE' | 'ONLINE' | 'DEGRADED';
    latencyMs: number;
    channel: string;
    successRate: number;
  }>;
}
