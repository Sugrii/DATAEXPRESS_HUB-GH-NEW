export type TelecomNetwork = 'MTN' | 'TELECEL' | 'AIRTELTIGO';

export type ProductCategory = 'DATA' | 'AIRTIME' | 'SPECIAL';

export interface TelecomPackage {
  id: string;
  name: string;
  network: TelecomNetwork;
  category: ProductCategory;
  dataAmount?: string;
  airtimeAmount?: string;
  validity: string;
  priceGhs: number;
  originalPriceGhs?: number;
  isPopular?: boolean;
  description: string;
}

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type RoutingGateway = 'HUBTEL' | 'DIRECT_TELCO';
export type DeliveryStatus = 'PENDING' | 'DELIVERED' | 'FAILED' | 'RETRYING';

export interface RefundDetails {
  refundReference: string;
  refundedAt: string;
  amountGhs: number;
  reason?: string;
  adminEmail?: string;
  status: 'PROCESSED' | 'PENDING' | 'SIMULATED';
}

export interface TelecomOrder {
  id: string;
  agentId: string;
  agentName: string;
  agentPhone: string;
  customerPhone: string;
  network: TelecomNetwork;
  productType: 'DATA' | 'AIRTIME';
  packageId: string;
  packageName: string;
  amountGhs: number;
  commissionGhs: number;
  paymentStatus: PaymentStatus;
  routingGateway: RoutingGateway;
  deliveryStatus: DeliveryStatus;
  deliveryMessage: string;
  hubtelTransactionId: string;
  paystackReference?: string;
  paymentReference?: string;
  momoProvider?: string;
  paidAt?: string;
  createdAt: string;
  status?: string;
  refundDetails?: RefundDetails;
}

export interface SubMerchant {
  id: string;
  name: string;
  businessName: string;
  phone: string;
  email?: string;
  commissionRate: number; // e.g. 10 for 10%
  totalCommissionEarned: number;
  availableCommissionBalance: number;
  totalSalesVolume: number;
  totalOrdersCount: number;
  status: 'active' | 'suspended';
  createdAt: string;
  momoNumber?: string;
  momoNetwork?: TelecomNetwork;
}

export interface CommissionRecord {
  id: string;
  orderId: string;
  agentId: string;
  amountGhs: number;
  orderTotalGhs: number;
  ratePercent: number;
  createdAt: string;
}

export interface PayoutRecord {
  id: string;
  agentId: string;
  amountGhs: number;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  momoNumber: string;
  momoNetwork: TelecomNetwork;
  requestedAt: string;
  processedAt?: string;
}

export interface NetworkHealth {
  network: TelecomNetwork;
  name: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
  latencyMs: number;
  successRate: number;
  lastChecked: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'customer' | 'agent' | 'admin';
  agentId?: string;
}

export interface HubtelApiCredentials {
  clientId: string;
  clientSecret: string;
  merchantAccountNumber: string;
  isConfigured: boolean;
}
