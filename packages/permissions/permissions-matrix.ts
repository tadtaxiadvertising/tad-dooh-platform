/**
 * TAD DOOH Platform - Background Data Collection Permissions Matrix
 * Defines data collection permissions per app, user type, and data category.
 * 
 * This matrix is referenced by the Privacy Policy and Cookie Policy for all 3 apps
 * (admin, advertiser, driver).
 */

// Data collection categories with descriptions and legal basis
export const DATA_CATEGORIES = {
  ESSENTIAL: {
    id: 'essential',
    name: 'Essential / Strictly Necessary',
    description: 'Data required for platform functionality, authentication, and security.',
    legalBasis: 'Legitimate interest / Contractual necessity',
    requiredFor: ['all'],
    consentRequired: false,
    examples: [
      'Session authentication tokens (sb-access-token)',
      'User profile data for login persistence',
      'System configuration for platform operation',
      'Audit log session IDs',
    ],
  },
  ANALYTICS: {
    id: 'analytics',
    name: 'Analytics / Performance',
    description: 'Data collected to understand how the platform is used, performance metrics, and usage patterns.',
    legalBasis: 'Legitimate interest / User consent',
    requiredFor: ['all'],
    consentRequired: true,
    examples: [
      'Page view tracking (Umami analytics)',
      'Query client cache statistics',
      'Error tracking (Sentry breadcrumbs)',
      'Dashboard polling metrics',
    ],
  },
  FUNCTIONAL: {
    id: 'functional',
    name: 'Functional / Preferences',
    description: 'Data that enables personalized features, settings, and user experience enhancements.',
    legalBasis: 'Legitimate interest / Consent',
    requiredFor: ['all'],
    consentRequired: true,
    examples: [
      'Map theme preference (dark/light)',
      'Session storage for referral codes',
      'LocalStorage user preferences',
      'Form draft autosave data',
    ],
  },
  ADMINISTRATIVE: {
    id: 'administrative',
    name: 'Administrative / System',
    description: 'Data used for admin functions, user management, platform configuration, and oversight.',
    legalBasis: 'Legitimate interest / Contractual necessity',
    requiredFor: ['admin'],
    consentRequired: false,
    examples: [
      'User management (create/update drivers, advertisers)',
      'System settings (platform version, pricing, maintenance mode)',
      'Finance/investor metrics',
      'Audit logs and compliance data',
    ],
  },
  CAMPAIGN: {
    id: 'campaign',
    name: 'Campaign / Business',
    description: 'Data related to advertising campaigns, creatives, targeting, and performance metrics.',
    legalBasis: 'Legitimate interest / Contractual necessity',
    requiredFor: ['advertiser'],
    consentRequired: true,
    examples: [
      'Campaign creation data (name, dates, creative URL)',
      'QR hub links (WhatsApp, social media, website)',
      'AI creative generation inputs (logo, brand color, ad copy)',
      'Billing and payment information',
      'Reporting and impact metrics',
    ],
  },
  LOCATION: {
    id: 'location',
    name: 'Location / Telemetry',
    description: 'GPS and location data for device tracking, fleet monitoring, and route optimization.',
    legalBasis: 'Legitimate interest / Explicit consent required',
    requiredFor: ['driver'],
    consentRequired: true,
    examples: [
      'GPS coordinates (lat/lng) via watchPosition',
      'Device telemetry batches (/fleet/track-batch)',
      'Real-time pings via Supabase fleet_tracking_live',
      'Driver route tracking and history',
      'Speed, battery, subscription status',
    ],
  },
  FINANCIAL: {
    id: 'financial',
    name: 'Financial / Billing',
    description: 'Payment data, earnings, transaction history, and billing information.',
    legalBasis: 'Legitimate interest / Contractual necessity / Legal compliance',
    requiredFor: ['advertiser', 'driver'],
    consentRequired: true,
    examples: [
      'Card payment details (card number, expiry, CVV)',
      'Bank account information (bank, account number, owner name, cedula)',
      'Transaction history and wallet balance',
      'Payout information and commission rates',
      'Subscription payment status',
    ],
  },
} as const

export type DataCategoryKey = keyof typeof DATA_CATEGORIES

// Per-app data collection configuration
export const APP_PERMISSIONS = {
  ADMIN: {
    name: 'Admin Dashboard',
    categories: [
      DATA_CATEGORIES.ESSENTIAL,
      DATA_CATEGORIES.ANALYTICS,
      DATA_CATEGORIES.FUNCTIONAL,
      DATA_CATEGORIES.ADMINISTRATIVE,
      DATA_CATEGORIES.FINANCIAL,
    ] as DataCategoryKey[],
    description: 'Full platform administration, user management, system configuration, and analytics oversight.',
    dataCollected: [
      // Essential
      'sb-access-token cookie (7-day expiry)',
      'tad_admin_token cookie (24h expiry)',
      'tad_session_id cookie (24h expiry)',
      // Analytics
      'Umami analytics page views',
      'Sentry error tracking breadcrumbs',
      'Query client refetch metrics',
      // Functional
      'Map theme preference persistence',
      'Dashboard widget preferences',
      // Administrative
      'User management data (drivers, advertisers)',
      'System settings configuration',
      'Finance/investor metrics',
      'Audit logs and compliance records',
    ],
    purposes: [
      'Platform operation and security',
      'Admin user management',
      'System configuration and maintenance',
      'Financial reporting and oversight',
      'Performance monitoring',
    ],
    consentRequired: true,
    consentCategories: [
      { key: 'essential', label: 'Essential platform functionality', required: true },
      { key: 'analytics', label: 'Platform analytics and performance', required: true },
      { key: 'functional', label: 'User preferences and settings', required: false },
      { key: 'administrative', label: 'Admin oversight and user management', required: true },
      { key: 'financial', label: 'Financial reporting and billing', required: true },
    ],
  },
  ADVERTISER: {
    name: 'Advertiser Portal',
    categories: [
      DATA_CATEGORIES.ESSENTIAL,
      DATA_CATEGORIES.ANALYTICS,
      DATA_CATEGORIES.FUNCTIONAL,
      DATA_CATEGORIES.CAMPAIGN,
      DATA_CATEGORIES.FINANCIAL,
    ] as DataCategoryKey[],
    description 'Advertiser campaign management, creative uploads, billing, and performance reporting.',
    dataCollected: [
      // Essential
      'sb-access-token cookie (7-day expiry)',
      'tad_advertiser_user localStorage',
      // Analytics
      'Umami analytics (configured but not actively wired)',
      'Sentry error monitoring',
      // Functional
      'Map theme preference',
      'Onboarding progress flags',
      // Campaign
      'Campaign creation data (name, dates, category, creative URL)',
      'QR hub links (WhatsApp, Instagram, Facebook, website, PedidosYa, UberEats)',
      'AI creative generation inputs (logo URL, brand color, primary/secondary text)',
      'Budget simulation inputs (city, budget amount)',
      // Financial
      'Card payment data (via NexPay integration)',
      'Bank transfer details',
      'Payment transaction history',
      'Wallet balance and billing invoices',
    ],
    purposes: [
      'Campaign creation and management',
      'Creative asset upload and AI generation',
      'Billing and payment processing',
      'Performance reporting and analytics',
      'Audience targeting and QR conversion tracking',
    ],
    consentRequired: true,
    consentCategories: [
      { key: 'essential', label: 'Essential platform functionality', required: true },
      { key: 'analytics', label: 'Platform analytics and performance', required: true },
      { key: 'functional', label: 'User preferences and settings', required: false },
      { key: 'campaign', label: 'Campaign creation and management', required: true },
      { key: 'financial', label: 'Billing, payments, and financial tracking', required: true },
    ],
  },
  DRIVER: {
    name: 'Driver Mobile App (PWA)',
    categories: [
      DATA_CATEGORIES.ESSENTIAL,
      DATA_CATEGORIES.ANALYTICS,
      DATA_CATEGORIES.FUNCTIONAL,
      DATA_CATEGORIES.LOCATION,
      DATA_CATEGORIES.FINANCIAL,
    ] as DataCategoryKey[],
    description: 'Driver trip tracking, earnings monitoring, vehicle status, and fleet telemetry.',
    dataCollected: [
      // Essential
      'sb-access-token cookie',
      'tad_driver_user localStorage',
      'TAD_DEVICE_ID localStorage',
      // Analytics
      'Sentry error tracking',
      'GPS telemetry batch counts',
      // Functional
      'Map theme preference',
      'Notification preferences',
      // Location
      'GPS coordinates via watchPosition (high accuracy)',
      'Real-time pings to Supabase fleet_tracking_live (every 30s)',
      'Device telemetry batches to /fleet/track-batch (every 5 min)',
      'Offline buffered GPS records (IndexedDB, max 500)',
      'Wake Lock to keep screen on during tracking',
      // Financial
      'Wallet balance and earnings (RD$)',
      'Transaction history',
      'Projected earnings',
      'Ads played count',
      'GPS points count',
      'Bank account information (banco, cuenta, tipo, ownerName, cedula)',
      'Agreement/contract acceptance status',
    ],
    purposes: [
      'Real-time fleet monitoring and telemetry',
      'Driver earnings and wallet tracking',
      'Route optimization and vehicle status',
      'Contract and agreement management',
      'Payment processing and payouts',
      'GPS-based location tracking for security',
    ],
    consentRequired: true,
    consentCategories: [
      { key: 'essential', label: 'Essential platform functionality', required: true },
      { key: 'analytics', label: 'Platform analytics and performance', required: true },
      { key: 'functional', label: 'User preferences and settings', required: false },
      { key: 'location', label: 'GPS location tracking and telemetry', required: true },
      { key: 'financial', label: 'Earnings, payments, and financial tracking', required: true },
    ],
  },
} as const

// Per-user-type consent requirements
export const CONSENT_REQUIREMENTS = {
  ADMIN: {
    requiredCategories: [
      DATA_CATEGORIES.ESSENTIAL.id,
      DATA_CATEGORIES.ANALYTICS.id,
      DATA_CATEGORIES.FUNCTIONAL.id,
      DATA_CATEGORIES.ADMINISTRATIVE.id,
      DATA_CATEGORIES.FINANCIAL.id,
    ],
    optionalCategories: [],
    defaultConsents: [
      DATA_CATEGORIES.ESSENTIAL.id,
      DATA_CATEGORIES.ANALYTICS.id,
      DATA_CATEGORIES.FUNCTIONAL.id,
      DATA_CATEGORIES.ADMINISTRATIVE.id,
      DATA_CATEGORIES.FINANCIAL.id,
    ],
    consentExpiry: null, // Essential never expires; others reviewed annually
    withdrawalMessage:
      'You can withdraw consent for non-essential data collection at any time via the admin settings page.',
  },
  ADVERTISER: {
    requiredCategories: [
      DATA_CATEGORIES.ESSENTIAL.id,
      DATA_CATEGORIES.ANALYTICS.id,
      DATA_CATEGORIES.FUNCTIONAL.id,
      DATA_CATEGORIES.CAMPAIGN.id,
      DATA_CATEGORIES.FINANCIAL.id,
    ],
    optionalCategories: [],
    defaultConsents: [
      DATA_CATEGORIES.ESSENTIAL.id,
      DATA_CATEGORIES.ANALYTICS.id,
      DATA_CATEGORIES.FUNCTIONAL.id,
      DATA_CATEGORIES.CAMPAIGN.id,
      DATA_CATEGORIES.FINANCIAL.id,
    ],
    consentExpiry: '12 months (annual review)',
    withdrawalMessage:
      'You can withdraw consent for non-essential data collection at any time via the advertiser profile page.',
  },
  DRIVER: {
    requiredCategories: [
      DATA_CATEGORIES.ESSENTIAL.id,
      DATA_CATEGORIES.ANALYTICS.id,
      DATA_CATEGORIES.FUNCTIONAL.id,
      DATA_CATEGORIES.LOCATION.id,
      DATA_CATEGORIES.FINANCIAL.id,
    ],
    optionalCategories: [],
    defaultConsents: [
      DATA_CATEGORIES.ESSENTIAL.id,
      DATA_CATEGORIES.ANALYTICS.id,
      DATA_CATEGORIES.FUNCTIONAL.id,
      DATA_CATEGORIES.LOCATION.id,
      DATA_CATEGORIES.FINANCIAL.id,
    ],
    consentExpiry: '6 months (semi-annual refresh required)',
    withdrawalMessage:
      'You can withdraw location consent at any time via the driver dashboard. Earnings data will remain processed per legal retention obligations.',
  },
}

// Data retention periods per category (from privacy policies)
export const DATA_RETENTION = {
  ESSENTIAL: {
    accountData: 'While active + 5 years after closure',
    sessionCookies: 'Up to 30 days',
    auditLogs: '3 years',
  },
  ANALYTICS: {
    aggregatedAnalytics: '2 years',
    sessionEvents: '30 days',
    errorLogs: '1 year',
  },
  FUNCTIONAL: {
    userPreferences: 'While active session',
    formDrafts: '90 days',
  },
  ADMINISTRATIVE: {
    userManagement: 'While active + 5 years after closure',
    systemConfigs: '5 years',
    auditRecords: '3 years',
  },
  CAMPAIGN: {
    campaignData: '7 years after finalization (tax requirement)',
    creatives: '7 years after finalization',
    billingRecords: '10 years (tax code)',
    analyticsReports: '2 years',
  },
  LOCATION: {
    realTimeGPS: '90 days',
    aggregatedLocation: '2 years',
    routeHistory: '2 years',
    fleetPings: '30 days',
  },
  FINANCIAL: {
    transactionHistory: '10 years (tax code)',
    paymentRecords: '10 years',
    bankAccountData: 'While active + 5 years after closure',
    earningsRecords: '7 years after driver departure',
    taxDocuments: '10 years',
  },
}

// Purpose descriptions for privacy policy sections
export const PURPOSE_DESCRIPTIONS = {
  ESSENTIAL: [
    'Enable user authentication and session management',
    'Ensure platform security and prevent unauthorized access',
    'Maintain platform functionality and availability',
    'Track platform usage for security and audit purposes',
  ],
  ANALYTICS: [
    'Understand how users interact with the platform',
    'Measure performance and identify improvements',
    'Monitor system health and error rates',
    'Anonymous usage pattern analysis',
  ],
  FUNCTIONAL: [
    'Remember user preferences (theme, layout, etc.)',
    'Enable personalized user experience',
    'Save form progress and session state',
    'Support offline mode functionality',
  ],
  ADMINISTRATIVE: [
    'Manage user accounts and roles (admin only)',
    'Configure platform settings and policies',
    'Track compliance and audit requirements',
    'Manage system-wide configurations',
  ],
  CAMPAIGN: [
    'Create and manage advertising campaigns',
    'Upload and generate creative assets',
    'Track campaign performance and metrics',
    'Manage QR conversion links and conversion tracking',
    'Process billing and payment for campaigns',
  ],
  LOCATION: [
    'Track driver vehicle location for fleet monitoring',
    'Enable real-time dashboard visualization',
    'Optimize ad display based on geographic coverage',
    'Ensure driver safety and vehicle security',
    'Generate route analytics and performance metrics',
  ],
  FINANCIAL: [
    'Process payments and billing for campaigns',
    'Track driver earnings and wallet balances',
    'Enable payouts and commission calculations',
    'Maintain tax-compliant financial records',
    'Manage subscription and referral payments',
  ],
}