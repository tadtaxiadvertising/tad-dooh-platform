
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  password: 'password',
  name: 'name',
  role: 'role',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DeviceScalarFieldEnum = {
  id: 'id',
  deviceId: 'deviceId',
  name: 'name',
  taxiNumber: 'taxiNumber',
  city: 'city',
  status: 'status',
  lastSync: 'lastSync',
  lastHeartbeat: 'lastHeartbeat',
  batteryLevel: 'batteryLevel',
  lastLat: 'lastLat',
  lastLng: 'lastLng',
  isOnline: 'isOnline',
  storageUsed: 'storageUsed',
  storageTotal: 'storageTotal',
  appVersion: 'appVersion',
  authToken: 'authToken',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  fleet: 'fleet',
  lastSeen: 'lastSeen',
  storageFree: 'storageFree',
  lastPlayback: 'lastPlayback',
  playerStatus: 'playerStatus',
  lastSyncHash: 'lastSyncHash',
  lastSyncAt: 'lastSyncAt',
  lastOnline: 'lastOnline',
  lastSyncSuccess: 'lastSyncSuccess',
  driverId: 'driverId',
  isSimulated: 'isSimulated',
  connectivityStatus: 'connectivityStatus'
};

exports.Prisma.CampaignScalarFieldEnum = {
  id: 'id',
  name: 'name',
  advertiser: 'advertiser',
  advertiserId: 'advertiserId',
  description: 'description',
  status: 'status',
  active: 'active',
  startDate: 'startDate',
  endDate: 'endDate',
  version: 'version',
  isGlobal: 'isGlobal',
  targetAll: 'targetAll',
  targetCities: 'targetCities',
  targetCity: 'targetCity',
  targetFleets: 'targetFleets',
  priority: 'priority',
  targetImpressions: 'targetImpressions',
  budget: 'budget',
  targetUrl: 'targetUrl',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  facebook: 'facebook',
  instagram: 'instagram',
  pedidosYaUrl: 'pedidosYaUrl',
  uberEatsUrl: 'uberEatsUrl',
  websiteUrl: 'websiteUrl',
  whatsapp: 'whatsapp',
  category: 'category'
};

exports.Prisma.PlaylistScalarFieldEnum = {
  id: 'id',
  campaignId: 'campaignId',
  name: 'name',
  loopType: 'loopType',
  createdAt: 'createdAt'
};

exports.Prisma.PlaylistItemScalarFieldEnum = {
  campaignId: 'campaignId',
  deviceId: 'deviceId'
};

exports.Prisma.DeviceCampaignScalarFieldEnum = {
  device_id: 'device_id',
  campaign_id: 'campaign_id',
  assigned_at: 'assigned_at'
};

exports.Prisma.MediaScalarFieldEnum = {
  id: 'id',
  name: 'name',
  filename: 'filename',
  originalFilename: 'originalFilename',
  mime_type: 'mime_type',
  mimeType: 'mimeType',
  size: 'size',
  fileSize: 'fileSize',
  durationSeconds: 'durationSeconds',
  width: 'width',
  height: 'height',
  storageKey: 'storageKey',
  url: 'url',
  cdnUrl: 'cdnUrl',
  hash: 'hash',
  hashMd5: 'hashMd5',
  hashSha256: 'hashSha256',
  campaign_id: 'campaign_id',
  status: 'status',
  createdAt: 'createdAt',
  qrUrl: 'qrUrl'
};

exports.Prisma.AnalyticsEventScalarFieldEnum = {
  id: 'id',
  deviceId: 'deviceId',
  campaignId: 'campaignId',
  mediaId: 'mediaId',
  eventType: 'eventType',
  eventData: 'eventData',
  lat: 'lat',
  lng: 'lng',
  timestamp: 'timestamp',
  occurredAt: 'occurredAt',
  receivedAt: 'receivedAt',
  processed: 'processed',
  isSimulated: 'isSimulated'
};

exports.Prisma.CampaignMetricScalarFieldEnum = {
  id: 'id',
  campaignId: 'campaignId',
  deviceId: 'deviceId',
  date: 'date',
  city: 'city',
  totalImpressions: 'totalImpressions',
  totalCompletions: 'totalCompletions',
  totalErrors: 'totalErrors',
  uniqueDevices: 'uniqueDevices',
  avgCompletionRate: 'avgCompletionRate',
  createdAt: 'createdAt'
};

exports.Prisma.DeviceCommandScalarFieldEnum = {
  id: 'id',
  deviceId: 'deviceId',
  commandType: 'commandType',
  commandParams: 'commandParams',
  status: 'status',
  createdAt: 'createdAt',
  executedAt: 'executedAt',
  result: 'result',
  expiresAt: 'expiresAt'
};

exports.Prisma.VideoScalarFieldEnum = {
  id: 'id',
  campaignId: 'campaignId',
  title: 'title',
  url: 'url',
  duration: 'duration',
  fileSize: 'fileSize',
  mimeType: 'mimeType',
  createdAt: 'createdAt',
  uploadedAt: 'uploadedAt',
  qrUrl: 'qrUrl',
  hashMd5: 'hashMd5'
};

exports.Prisma.DeviceHeartbeatScalarFieldEnum = {
  id: 'id',
  deviceId: 'deviceId',
  batteryLevel: 'batteryLevel',
  storageFree: 'storageFree',
  timestamp: 'timestamp'
};

exports.Prisma.PlaybackEventScalarFieldEnum = {
  id: 'id',
  deviceId: 'deviceId',
  eventType: 'eventType',
  videoId: 'videoId',
  lat: 'lat',
  lng: 'lng',
  timestamp: 'timestamp',
  isSimulated: 'isSimulated'
};

exports.Prisma.MediaAssetScalarFieldEnum = {
  id: 'id',
  campaignId: 'campaignId',
  type: 'type',
  filename: 'filename',
  url: 'url',
  fileSize: 'fileSize',
  checksum: 'checksum',
  duration: 'duration',
  version: 'version',
  createdAt: 'createdAt',
  qrUrl: 'qrUrl'
};

exports.Prisma.FleetScalarFieldEnum = {
  id: 'id',
  name: 'name',
  city: 'city',
  createdAt: 'createdAt'
};

exports.Prisma.DriverScalarFieldEnum = {
  id: 'id',
  fullName: 'fullName',
  cedula: 'cedula',
  phone: 'phone',
  licensePlate: 'licensePlate',
  taxiPlate: 'taxiPlate',
  taxiNumber: 'taxiNumber',
  subscriptionPaid: 'subscriptionPaid',
  subscriptionEnd: 'subscriptionEnd',
  status: 'status',
  onboardingStatus: 'onboardingStatus',
  onboardedAt: 'onboardedAt',
  blockedAt: 'blockedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  referredBy: 'referredBy',
  password: 'password',
  level: 'level',
  consecutiveMonthsUnderGoal: 'consecutiveMonthsUnderGoal',
  identidadVehicular: 'identidadVehicular',
  hardwareConfig: 'hardwareConfig',
  insuranceAccepted: 'insuranceAccepted',
  insuranceAcceptedAt: 'insuranceAcceptedAt',
  contractAccepted: 'contractAccepted',
  contractAcceptedAt: 'contractAcceptedAt',
  agreementVersion: 'agreementVersion',
  isSimulated: 'isSimulated',
  walletBalance: 'walletBalance',
  referralCode: 'referralCode',
  bankAccount: 'bankAccount'
};

exports.Prisma.FinancialTransactionScalarFieldEnum = {
  id: 'id',
  type: 'type',
  category: 'category',
  amount: 'amount',
  netAmount: 'netAmount',
  taxAmount: 'taxAmount',
  status: 'status',
  entityId: 'entityId',
  reference: 'reference',
  note: 'note',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PayrollPaymentScalarFieldEnum = {
  id: 'id',
  driverId: 'driverId',
  amount: 'amount',
  month: 'month',
  year: 'year',
  status: 'status',
  referenceNum: 'referenceNum',
  paidAt: 'paidAt',
  createdAt: 'createdAt',
  penaltyApplied: 'penaltyApplied',
  penaltyPercentage: 'penaltyPercentage',
  transmissionHours: 'transmissionHours',
  activeAds: 'activeAds',
  gpsPoints: 'gpsPoints'
};

exports.Prisma.SubscriptionScalarFieldEnum = {
  id: 'id',
  driverId: 'driverId',
  deviceId: 'deviceId',
  plan: 'plan',
  amount: 'amount',
  status: 'status',
  startDate: 'startDate',
  dueDate: 'dueDate',
  validUntil: 'validUntil',
  paidAt: 'paidAt',
  paymentMethod: 'paymentMethod',
  notes: 'notes',
  isSimulated: 'isSimulated',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AdvertiserScalarFieldEnum = {
  id: 'id',
  companyName: 'companyName',
  contactName: 'contactName',
  email: 'email',
  phone: 'phone',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  facebook: 'facebook',
  instagram: 'instagram',
  productsData: 'productsData',
  websiteUrl: 'websiteUrl',
  whatsapp: 'whatsapp',
  category: 'category',
  pedidosYaUrl: 'pedidosYaUrl',
  uberEatsUrl: 'uberEatsUrl',
  referredBy: 'referredBy',
  password: 'password'
};

exports.Prisma.PortalRequestScalarFieldEnum = {
  id: 'id',
  advertiserId: 'advertiserId',
  driverId: 'driverId',
  campaignId: 'campaignId',
  type: 'type',
  status: 'status',
  title: 'title',
  description: 'description',
  data: 'data',
  adminNotes: 'adminNotes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DriverLocationScalarFieldEnum = {
  id: 'id',
  driverId: 'driverId',
  deviceId: 'deviceId',
  latitude: 'latitude',
  longitude: 'longitude',
  speed: 'speed',
  timestamp: 'timestamp',
  isSimulated: 'isSimulated'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  title: 'title',
  message: 'message',
  type: 'type',
  category: 'category',
  read: 'read',
  entityId: 'entityId',
  createdAt: 'createdAt'
};

exports.Prisma.BiDashboardSnapshotScalarFieldEnum = {
  id: 'id',
  snapshotDate: 'snapshotDate',
  mrr: 'mrr',
  totalDevices: 'totalDevices',
  onlineDevices: 'onlineDevices',
  offlineDevices: 'offlineDevices',
  criticalDevices: 'criticalDevices',
  activeCampaigns: 'activeCampaigns',
  totalImpressionsMtd: 'totalImpressionsMtd',
  deliveryRateAvg: 'deliveryRateAvg',
  syncHealthRate: 'syncHealthRate',
  yieldPerScreen: 'yieldPerScreen',
  arpu: 'arpu',
  churnRate: 'churnRate',
  projectedRevenue: 'projectedRevenue',
  generatedAt: 'generatedAt'
};

exports.Prisma.ReconciliationReportScalarFieldEnum = {
  id: 'id',
  period: 'period',
  driverId: 'driverId',
  deviceId: 'deviceId',
  subscriptionStatus: 'subscriptionStatus',
  subscriptionDueDate: 'subscriptionDueDate',
  subscriptionAmount: 'subscriptionAmount',
  totalPlaybacks: 'totalPlaybacks',
  activeCampaigns: 'activeCampaigns',
  revenueContracted: 'revenueContracted',
  revenueReceived: 'revenueReceived',
  payrollDue: 'payrollDue',
  payrollPaid: 'payrollPaid',
  hasDiscrepancy: 'hasDiscrepancy',
  discrepancyType: 'discrepancyType',
  discrepancyAmount: 'discrepancyAmount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ContractAcceptanceScalarFieldEnum = {
  id: 'id',
  driverId: 'driverId',
  version: 'version',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  timestamp: 'timestamp'
};

exports.Prisma.AdvertiserSubscriptionScalarFieldEnum = {
  id: 'id',
  advertiserId: 'advertiserId',
  numberOfScreens: 'numberOfScreens',
  monthlyRate: 'monthlyRate',
  taxRate: 'taxRate',
  status: 'status',
  nextBillingDate: 'nextBillingDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InvoiceScalarFieldEnum = {
  id: 'id',
  advertiserId: 'advertiserId',
  issueDate: 'issueDate',
  dueDate: 'dueDate',
  subtotal: 'subtotal',
  taxAmount: 'taxAmount',
  totalAmount: 'totalAmount',
  status: 'status',
  pdfUrl: 'pdfUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ActiveAdScalarFieldEnum = {
  id: 'id',
  driverId: 'driverId',
  campaignId: 'campaignId',
  status: 'status'
};

exports.Prisma.CommissionScalarFieldEnum = {
  id: 'id',
  driverId: 'driverId',
  amount: 'amount',
  sourceType: 'sourceType',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.TelemetryScalarFieldEnum = {
  id: 'id',
  driverId: 'driverId',
  speed: 'speed',
  battery: 'battery',
  network: 'network',
  timestamp: 'timestamp'
};

exports.Prisma.WalletScalarFieldEnum = {
  id: 'id',
  driverId: 'driverId',
  availableBalance: 'availableBalance',
  pendingWithdrawal: 'pendingWithdrawal',
  bankInfo: 'bankInfo'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.SystemStatus = exports.$Enums.SystemStatus = {
  OPERATIVO: 'OPERATIVO',
  PENDIENTE_PAGO: 'PENDIENTE_PAGO',
  BLOQUEADO: 'BLOQUEADO'
};

exports.Prisma.ModelName = {
  User: 'User',
  Device: 'Device',
  Campaign: 'Campaign',
  Playlist: 'Playlist',
  PlaylistItem: 'PlaylistItem',
  DeviceCampaign: 'DeviceCampaign',
  Media: 'Media',
  AnalyticsEvent: 'AnalyticsEvent',
  CampaignMetric: 'CampaignMetric',
  DeviceCommand: 'DeviceCommand',
  Video: 'Video',
  DeviceHeartbeat: 'DeviceHeartbeat',
  PlaybackEvent: 'PlaybackEvent',
  MediaAsset: 'MediaAsset',
  Fleet: 'Fleet',
  Driver: 'Driver',
  FinancialTransaction: 'FinancialTransaction',
  PayrollPayment: 'PayrollPayment',
  Subscription: 'Subscription',
  Advertiser: 'Advertiser',
  PortalRequest: 'PortalRequest',
  DriverLocation: 'DriverLocation',
  Notification: 'Notification',
  BiDashboardSnapshot: 'BiDashboardSnapshot',
  ReconciliationReport: 'ReconciliationReport',
  ContractAcceptance: 'ContractAcceptance',
  AdvertiserSubscription: 'AdvertiserSubscription',
  Invoice: 'Invoice',
  ActiveAd: 'ActiveAd',
  Commission: 'Commission',
  Telemetry: 'Telemetry',
  Wallet: 'Wallet'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
