import { BundlePackage, TelecomNetwork } from '../types';

export const GHANA_PREFIX_MAP: Record<string, TelecomNetwork> = {
  // MTN Ghana
  '024': 'MTN',
  '054': 'MTN',
  '055': 'MTN',
  '059': 'MTN',
  '025': 'MTN',
  // Telecel Ghana (formerly Vodafone)
  '020': 'TELECEL',
  '050': 'TELECEL',
  // AT Ghana (formerly AirtelTigo)
  '027': 'AT',
  '057': 'AT',
  '026': 'AT',
  '056': 'AT',
};

export function detectGhanaNetwork(phone: string): TelecomNetwork | null {
  const clean = phone.replace(/[\s\-+]/g, '');
  let localFormat = clean;
  if (clean.startsWith('233')) {
    localFormat = '0' + clean.slice(3);
  }
  if (localFormat.length >= 3) {
    const prefix = localFormat.slice(0, 3);
    if (GHANA_PREFIX_MAP[prefix]) {
      return GHANA_PREFIX_MAP[prefix];
    }
  }
  return null;
}

export function formatGhanaPhone(phone: string): string {
  const clean = phone.replace(/[\s\-+]/g, '');
  if (clean.startsWith('233') && clean.length === 12) {
    return '0' + clean.slice(3);
  }
  return clean;
}

export const TELECOM_CATALOG: BundlePackage[] = [
  // --- MTN GHANA ---
  {
    id: 'mtn-noexp-1gb',
    network: 'MTN',
    name: 'MTN Non-Expiry 1GB',
    category: 'NON_EXPIRY',
    dataAmount: '1.0 GB',
    price: 12.0,
    validity: 'No Expiry',
    description: 'Standard high-speed 4G+/5G Data with lifetime validity.',
    popular: true,
    hubtelBundleId: 'MTN_NOEXP_1GB',
    ussdCode: '*138#',
  },
  {
    id: 'mtn-noexp-2-5gb',
    network: 'MTN',
    name: 'MTN Non-Expiry 2.5GB',
    category: 'NON_EXPIRY',
    dataAmount: '2.5 GB',
    price: 25.0,
    validity: 'No Expiry',
    description: 'Best-selling personal data bundle with no expiry.',
    popular: true,
    hubtelBundleId: 'MTN_NOEXP_2_5GB',
    ussdCode: '*138#',
  },
  {
    id: 'mtn-noexp-5gb',
    network: 'MTN',
    name: 'MTN Non-Expiry 5GB',
    category: 'NON_EXPIRY',
    dataAmount: '5.0 GB',
    price: 45.0,
    validity: 'No Expiry',
    description: 'Perfect for regular streaming, work and social media.',
    popular: true,
    hubtelBundleId: 'MTN_NOEXP_5GB',
    ussdCode: '*138#',
  },
  {
    id: 'mtn-noexp-10gb',
    network: 'MTN',
    name: 'MTN Non-Expiry 10GB',
    category: 'NON_EXPIRY',
    dataAmount: '10.0 GB',
    price: 85.0,
    validity: 'No Expiry',
    description: 'High capacity heavy internet bundle with zero expiration.',
    popular: true,
    hubtelBundleId: 'MTN_NOEXP_10GB',
    ussdCode: '*138#',
  },
  {
    id: 'mtn-noexp-20gb',
    network: 'MTN',
    name: 'MTN Non-Expiry 20GB',
    category: 'NON_EXPIRY',
    dataAmount: '20.0 GB',
    price: 160.0,
    validity: 'No Expiry',
    description: 'Power user bundle for heavy video, downloads and gaming.',
    hubtelBundleId: 'MTN_NOEXP_20GB',
    ussdCode: '*138#',
  },
  {
    id: 'mtn-noexp-50gb',
    network: 'MTN',
    name: 'MTN Non-Expiry 50GB',
    category: 'NON_EXPIRY',
    dataAmount: '50.0 GB',
    price: 360.0,
    validity: 'No Expiry',
    description: 'Bulk enterprise data bundle for family or office hotspots.',
    hubtelBundleId: 'MTN_NOEXP_50GB',
    ussdCode: '*138#',
  },
  {
    id: 'mtn-turbonet-100gb',
    network: 'MTN',
    name: 'MTN TurboNet 100GB',
    category: 'TURBONET',
    dataAmount: '100.0 GB',
    price: 450.0,
    validity: '30 Days',
    description: 'Ultra-fast home/office router 4G+ & 5G high speed package.',
    hubtelBundleId: 'MTN_TURBO_100GB',
    ussdCode: '*138*1#',
  },
  {
    id: 'mtn-midnight-unlimited',
    network: 'MTN',
    name: 'MTN Midnight Special',
    category: 'SPECIAL',
    dataAmount: '7.5 GB',
    price: 6.0,
    validity: '12:00 AM - 5:00 AM',
    description: 'Super night owl bundle for downloads and software updates.',
    hubtelBundleId: 'MTN_MIDNIGHT',
    ussdCode: '*138*1#',
  },
  {
    id: 'mtn-airtime-flexi',
    network: 'MTN',
    name: 'MTN Flexi Airtime',
    category: 'AIRTIME',
    dataAmount: 'Direct Airtime',
    price: 10.0,
    validity: 'Standard',
    description: 'Instant Airtime top-up for voice calls and SMS to all networks.',
    hubtelBundleId: 'MTN_AIRTIME',
    ussdCode: '*170#',
  },

  // --- TELECEL GHANA (Formerly Vodafone) ---
  {
    id: 'telecel-bossu-2gb',
    network: 'TELECEL',
    name: 'Telecel Bossu 2GB Daily',
    category: 'DAILY',
    dataAmount: '2.0 GB',
    price: 10.0,
    validity: '24 Hours',
    description: 'Daily Bossu bundle with extra 50 mins voice calls.',
    popular: true,
    hubtelBundleId: 'TELECEL_BOSSU_2GB',
    ussdCode: '*110#',
  },
  {
    id: 'telecel-bossu-5gb',
    network: 'TELECEL',
    name: 'Telecel Bossu 5GB Weekly',
    category: 'WEEKLY',
    dataAmount: '5.0 GB',
    price: 25.0,
    validity: '7 Days',
    description: 'Weekly high-speed data with free on-net calls.',
    popular: true,
    hubtelBundleId: 'TELECEL_BOSSU_5GB',
    ussdCode: '*110#',
  },
  {
    id: 'telecel-2moorch-15gb',
    network: 'TELECEL',
    name: 'Telecel 2 Moorch 15GB',
    category: 'MONTHLY',
    dataAmount: '15.0 GB',
    price: 80.0,
    validity: '30 Days',
    description: 'Monthly unlimited social media + 15GB all-purpose data.',
    popular: true,
    hubtelBundleId: 'TELECEL_2MOORCH_15GB',
    ussdCode: '*700#',
  },
  {
    id: 'telecel-jumbo-40gb',
    network: 'TELECEL',
    name: 'Telecel Jumbo 40GB',
    category: 'MONTHLY',
    dataAmount: '40.0 GB',
    price: 180.0,
    validity: '30 Days',
    description: 'Heavy data pack for streaming Netflix, YouTube & TikTok.',
    hubtelBundleId: 'TELECEL_JUMBO_40GB',
    ussdCode: '*700#',
  },
  {
    id: 'telecel-jumbo-100gb',
    network: 'TELECEL',
    name: 'Telecel Jumbo 100GB',
    category: 'TURBONET',
    dataAmount: '100.0 GB',
    price: 400.0,
    validity: '60 Days',
    description: 'Mega family & MiFi router broadband package.',
    hubtelBundleId: 'TELECEL_JUMBO_100GB',
    ussdCode: '*700#',
  },
  {
    id: 'telecel-airtime-flexi',
    network: 'TELECEL',
    name: 'Telecel Flexi Airtime',
    category: 'AIRTIME',
    dataAmount: 'Direct Airtime',
    price: 10.0,
    validity: 'Standard',
    description: 'Instant Telecel Airtime recharge to your number.',
    hubtelBundleId: 'TELECEL_AIRTIME',
    ussdCode: '*110#',
  },

  // --- AT GHANA (Formerly AirtelTigo) ---
  {
    id: 'at-bigtime-2gb',
    network: 'AT',
    name: 'AT Big Time 2GB (No Expiry)',
    category: 'NON_EXPIRY',
    dataAmount: '2.0 GB',
    price: 12.0,
    validity: 'No Expiry',
    description: 'Original No-Expiry data with high download speeds.',
    popular: true,
    hubtelBundleId: 'AT_BIGTIME_2GB',
    ussdCode: '*111#',
  },
  {
    id: 'at-bigtime-6gb',
    network: 'AT',
    name: 'AT Big Time 6GB (No Expiry)',
    category: 'NON_EXPIRY',
    dataAmount: '6.0 GB',
    price: 30.0,
    validity: 'No Expiry',
    description: 'High value data bundle with zero expiration date.',
    popular: true,
    hubtelBundleId: 'AT_BIGTIME_6GB',
    ussdCode: '*111#',
  },
  {
    id: 'at-sika-15gb',
    network: 'AT',
    name: 'AT Sika Kokoo 15GB',
    category: 'MONTHLY',
    dataAmount: '15.0 GB',
    price: 65.0,
    validity: '30 Days',
    description: 'Economic value pack for students and remote workers.',
    popular: true,
    hubtelBundleId: 'AT_SIKA_15GB',
    ussdCode: '*111#',
  },
  {
    id: 'at-sika-35gb',
    network: 'AT',
    name: 'AT Sika Kokoo 35GB',
    category: 'MONTHLY',
    dataAmount: '35.0 GB',
    price: 130.0,
    validity: '30 Days',
    description: 'Generous monthly data quota for intense internet usage.',
    hubtelBundleId: 'AT_SIKA_35GB',
    ussdCode: '*111#',
  },
  {
    id: 'at-airtime-flexi',
    network: 'AT',
    name: 'AT Flexi Airtime',
    category: 'AIRTIME',
    dataAmount: 'Direct Airtime',
    price: 10.0,
    validity: 'Standard',
    description: 'Instant AT Money & Airtime direct top-up to subscriber.',
    hubtelBundleId: 'AT_AIRTIME',
    ussdCode: '*100#',
  },
];

export const NETWORK_THEMES: Record<TelecomNetwork, {
  name: string;
  badge: string;
  primaryBg: string;
  secondaryBg: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
  hoverBg: string;
  tagline: string;
  momoName: string;
}> = {
  MTN: {
    name: 'MTN Ghana',
    badge: 'Everywhere You Go',
    primaryBg: 'bg-amber-400',
    secondaryBg: 'bg-amber-950/40',
    borderColor: 'border-amber-400/40',
    textColor: 'text-amber-400',
    accentColor: '#fbbf24',
    hoverBg: 'hover:bg-amber-400/10',
    tagline: 'Ghana\'s fastest 4G+/5G network',
    momoName: 'MTN MoMo',
  },
  TELECEL: {
    name: 'Telecel Ghana',
    badge: 'Connecting More',
    primaryBg: 'bg-rose-600',
    secondaryBg: 'bg-rose-950/40',
    borderColor: 'border-rose-500/40',
    textColor: 'text-rose-400',
    accentColor: '#e11d48',
    hoverBg: 'hover:bg-rose-600/10',
    tagline: 'Reliable fiber-speed connectivity',
    momoName: 'Telecel Cash',
  },
  AT: {
    name: 'AT Ghana',
    badge: 'Life is Simple',
    primaryBg: 'bg-blue-600',
    secondaryBg: 'bg-blue-950/40',
    borderColor: 'border-blue-500/40',
    textColor: 'text-blue-400',
    accentColor: '#2563eb',
    hoverBg: 'hover:bg-blue-600/10',
    tagline: 'Affordable data with no expiry',
    momoName: 'AT Money',
  },
};
