import { TelecomNetwork, TelecomPackage } from '../types';

export interface NetworkInfo {
  id: TelecomNetwork;
  name: string;
  shortName: string;
  primaryColor: string;
  accentColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  ussdBalance: string;
  ussdShare: string;
  prefixes: string[];
}

export const TELECOM_NETWORKS: Record<TelecomNetwork, NetworkInfo> = {
  MTN: {
    id: 'MTN',
    name: 'MTN Ghana',
    shortName: 'MTN',
    primaryColor: '#eab308', // amber-500
    accentColor: '#ca8a04',
    badgeBg: 'bg-amber-500/10',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-400',
    ussdBalance: '*124#',
    ussdShare: '*198#',
    prefixes: ['024', '054', '055', '059', '025'],
  },
  TELECEL: {
    id: 'TELECEL',
    name: 'Telecel Ghana (Vodafone)',
    shortName: 'Telecel',
    primaryColor: '#ef4444', // red-500
    accentColor: '#dc2626',
    badgeBg: 'bg-red-500/10',
    badgeBorder: 'border-red-500/30',
    badgeText: 'text-red-400',
    ussdBalance: '*124#',
    ussdShare: '*110#',
    prefixes: ['020', '050'],
  },
  AIRTELTIGO: {
    id: 'AIRTELTIGO',
    name: 'AT (AirtelTigo)',
    shortName: 'AT',
    primaryColor: '#3b82f6', // blue-500
    accentColor: '#2563eb',
    badgeBg: 'bg-blue-500/10',
    badgeBorder: 'border-blue-500/30',
    badgeText: 'text-blue-400',
    ussdBalance: '*134#',
    ussdShare: '*110#',
    prefixes: ['027', '057', '026', '056'],
  },
};

export const TELECOM_PACKAGES: TelecomPackage[] = [
  // MTN Data Bundles
  {
    id: 'mtn-data-1gb',
    name: 'MTN 1GB Turbo Data',
    network: 'MTN',
    category: 'DATA',
    dataAmount: '1 GB',
    validity: 'Non-Expiry',
    priceGhs: 12.0,
    originalPriceGhs: 14.0,
    isPopular: false,
    description: 'Direct fast delivery non-expiry data for MTN Ghana lines.',
  },
  {
    id: 'mtn-data-2.5gb',
    name: 'MTN 2.5GB Turbo Data',
    network: 'MTN',
    category: 'DATA',
    dataAmount: '2.5 GB',
    validity: 'Non-Expiry',
    priceGhs: 25.0,
    originalPriceGhs: 28.0,
    isPopular: true,
    description: 'Best-selling personal bundle. No expiry, ultra-fast 4G/5G speeds.',
  },
  {
    id: 'mtn-data-5gb',
    name: 'MTN 5GB Mega Data',
    network: 'MTN',
    category: 'DATA',
    dataAmount: '5 GB',
    validity: 'Non-Expiry',
    priceGhs: 45.0,
    originalPriceGhs: 50.0,
    isPopular: true,
    description: 'Work & stream favorite. Non-expiry rollover on active SIM.',
  },
  {
    id: 'mtn-data-10gb',
    name: 'MTN 10GB Power Data',
    network: 'MTN',
    category: 'DATA',
    dataAmount: '10 GB',
    validity: 'Non-Expiry',
    priceGhs: 85.0,
    originalPriceGhs: 95.0,
    isPopular: false,
    description: 'Heavy browsing, streaming & hotspot sharing.',
  },
  {
    id: 'mtn-data-20gb',
    name: 'MTN 20GB Ultra Data',
    network: 'MTN',
    category: 'DATA',
    dataAmount: '20 GB',
    validity: 'Non-Expiry',
    priceGhs: 160.0,
    originalPriceGhs: 180.0,
    isPopular: false,
    description: 'Sub-merchant favorite. Non-expiry direct recharge.',
  },
  {
    id: 'mtn-data-50gb',
    name: 'MTN 50GB Business Bundle',
    network: 'MTN',
    category: 'DATA',
    dataAmount: '50 GB',
    validity: 'Non-Expiry',
    priceGhs: 375.0,
    originalPriceGhs: 400.0,
    isPopular: false,
    description: 'Corporate and heavy work from home fiber-alternative.',
  },

  // Telecel Data Bundles
  {
    id: 'tel-data-1.5gb',
    name: 'Telecel 1.5GB Super',
    network: 'TELECEL',
    category: 'DATA',
    dataAmount: '1.5 GB',
    validity: 'Non-Expiry',
    priceGhs: 13.0,
    originalPriceGhs: 15.0,
    isPopular: false,
    description: 'Fast non-expiry internet across Telecel 4G network.',
  },
  {
    id: 'tel-data-4gb',
    name: 'Telecel 4GB Super Max',
    network: 'TELECEL',
    category: 'DATA',
    dataAmount: '4 GB',
    validity: 'Non-Expiry',
    priceGhs: 35.0,
    originalPriceGhs: 40.0,
    isPopular: true,
    description: 'Customer choice for social media, YouTube and downloads.',
  },
  {
    id: 'tel-data-10gb',
    name: 'Telecel 10GB Enterprise',
    network: 'TELECEL',
    category: 'DATA',
    dataAmount: '10 GB',
    validity: 'Non-Expiry',
    priceGhs: 80.0,
    originalPriceGhs: 90.0,
    isPopular: false,
    description: 'High capacity data without expiry restrictions.',
  },
  {
    id: 'tel-data-25gb',
    name: 'Telecel 25GB Mega',
    network: 'TELECEL',
    category: 'DATA',
    dataAmount: '25 GB',
    validity: 'Non-Expiry',
    priceGhs: 185.0,
    originalPriceGhs: 210.0,
    isPopular: false,
    description: 'Direct Hubtel router provisioning for Telecel SIM cards.',
  },

  // AT / AirtelTigo Bundles
  {
    id: 'at-data-2gb',
    name: 'AT Big Time 2GB',
    network: 'AIRTELTIGO',
    category: 'DATA',
    dataAmount: '2 GB',
    validity: 'Non-Expiry',
    priceGhs: 14.0,
    originalPriceGhs: 16.0,
    isPopular: false,
    description: 'AT Big Time Data that does not expire. Pure value.',
  },
  {
    id: 'at-data-6gb',
    name: 'AT Big Time 6GB',
    network: 'AIRTELTIGO',
    category: 'DATA',
    dataAmount: '6 GB',
    validity: 'Non-Expiry',
    priceGhs: 40.0,
    originalPriceGhs: 46.0,
    isPopular: true,
    description: 'Super value bundle for AT subscribers with non-expiry guarantee.',
  },
  {
    id: 'at-data-15gb',
    name: 'AT Big Time 15GB',
    network: 'AIRTELTIGO',
    category: 'DATA',
    dataAmount: '15 GB',
    validity: 'Non-Expiry',
    priceGhs: 95.0,
    originalPriceGhs: 110.0,
    isPopular: false,
    description: 'High volume non-expiry data for heavy AT users.',
  },

  // Airtime Top-Ups (All Networks)
  {
    id: 'airtime-10',
    name: 'GHS 10 Airtime Voucher',
    network: 'MTN',
    category: 'AIRTIME',
    airtimeAmount: 'GHS 10.00',
    validity: 'Instant Delivery',
    priceGhs: 10.0,
    isPopular: true,
    description: 'Instant recharge direct to balance for calls and SMS.',
  },
  {
    id: 'airtime-20',
    name: 'GHS 20 Airtime Voucher',
    network: 'MTN',
    category: 'AIRTIME',
    airtimeAmount: 'GHS 20.00',
    validity: 'Instant Delivery',
    priceGhs: 20.0,
    isPopular: true,
    description: 'Instant recharge direct to balance for calls and SMS.',
  },
  {
    id: 'airtime-50',
    name: 'GHS 50 Airtime Voucher',
    network: 'MTN',
    category: 'AIRTIME',
    airtimeAmount: 'GHS 50.00',
    validity: 'Instant Delivery',
    priceGhs: 50.0,
    isPopular: false,
    description: 'Instant recharge direct to balance for calls and SMS.',
  },
  {
    id: 'airtime-100',
    name: 'GHS 100 Airtime Voucher',
    network: 'MTN',
    category: 'AIRTIME',
    airtimeAmount: 'GHS 100.00',
    validity: 'Instant Delivery',
    priceGhs: 100.0,
    isPopular: false,
    description: 'Bulk recharge for heavy voice and emergency usage.',
  },
];

export function detectNetworkFromPhone(phone: string): TelecomNetwork {
  const cleaned = phone.replace(/[^0-9]/g, '');
  let prefix = '';

  if (cleaned.startsWith('233') && cleaned.length >= 5) {
    prefix = '0' + cleaned.substring(3, 5);
  } else if (cleaned.startsWith('0') && cleaned.length >= 3) {
    prefix = cleaned.substring(0, 3);
  }

  for (const net of Object.values(TELECOM_NETWORKS)) {
    if (net.prefixes.includes(prefix)) {
      return net.id;
    }
  }

  return 'MTN'; // Default fallback
}

export function formatGhanaPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('233') && digits.length === 12) {
    return '0' + digits.substring(3);
  }
  if (digits.length === 9) {
    return '0' + digits;
  }
  return digits;
}

export function isValidGhanaPhone(phone: string): boolean {
  const formatted = formatGhanaPhone(phone);
  return /^0[25][0-9]{8}$/.test(formatted);
}
