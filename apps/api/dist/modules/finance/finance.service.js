"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FinanceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const invoice_service_1 = require("./invoice.service");
const throttler_util_1 = require("../../utils/throttler.util");
const whatsapp_service_1 = require("../notifications/whatsapp.service");
const email_service_1 = require("../notifications/email.service");
const schedule_1 = require("@nestjs/schedule");
const business_rules_1 = require("../../common/constants/business-rules");
const mediaSafeSelect = {
    id: true,
    name: true,
    filename: true,
    originalFilename: true,
    mime_type: true,
    mimeType: true,
    durationSeconds: true,
    width: true,
    height: true,
    storageKey: true,
    url: true,
    cdnUrl: true,
    hash: true,
    hashMd5: true,
    hashSha256: true,
    campaign_id: true,
    status: true,
    createdAt: true,
    qrUrl: true,
};
let FinanceService = FinanceService_1 = class FinanceService {
    constructor(prisma, invoiceService, whatsappService, emailService) {
        this.prisma = prisma;
        this.invoiceService = invoiceService;
        this.whatsappService = whatsappService;
        this.emailService = emailService;
        this.logger = new common_1.Logger(FinanceService_1.name);
        this.PAY_PER_AD = business_rules_1.BUSINESS_RULES.DRIVER_RATE_PER_CAMPAIGN_RD;
        this.ITBIS_RATE = business_rules_1.BUSINESS_RULES.ITBIS_RATE;
        this.RECURRING_SUB_BASE = business_rules_1.BUSINESS_RULES.STARTER_KIT_ANNUAL_FEE_RD;
        this.REFERRAL_RETENTION_RATE = business_rules_1.BUSINESS_RULES.REFERRAL_RETENTION_RATE;
    }
    async onModuleInit() {
        this.logger.log('🔄 [RECOVERY] Checking for missed automated tasks...');
        await this.checkHighDelinquency();
    }
    async notifyMorosidad(deviceId) {
        this.logger.warn(`🚨 [FINANCE_ALERT] Triggering Morosidad Protocol for Device: ${deviceId}`);
        const device = await this.prisma.device.findUnique({
            where: { deviceId },
            include: { driver: true }
        });
        if (!device)
            return;
        const pdfBuffer = await this.invoiceService.generateDebtInvoicePDF({
            deviceId: device.deviceId,
            chofer: device.driver?.fullName || 'Socio TAD',
            placa: device.taxiNumber
        });
        const driverPhone = device.driver?.phone;
        const driverName = device.driver?.fullName || 'Socio TAD';
        if (driverPhone) {
            await this.whatsappService.sendDelinquencyAlert(driverPhone, driverName, device.deviceId);
            this.logger.log(`📱 [WHATSAPP_SENT] Alerta de Morosidad enviada a: ${driverPhone}`);
        }
        const amount = business_rules_1.BUSINESS_RULES.STARTER_KIT_ANNUAL_FEE_RD;
        const taxAmount = (amount / (1 + business_rules_1.BUSINESS_RULES.ITBIS_RATE)) * business_rules_1.BUSINESS_RULES.ITBIS_RATE;
        const netAmount = amount - taxAmount;
        await this.prisma.financialTransaction.create({
            data: {
                type: 'INCOMING',
                category: 'SUSCRIPCION',
                status: 'PENDING',
                amount,
                taxAmount,
                netAmount,
                entityId: device.driver?.id,
                reference: `REGLA-402-${deviceId.substring(0, 8)}`,
                note: `Factura de morosidad generada automáticamente por Kill-Switch.`
            }
        });
        return { success: true, notified: !!driverPhone };
    }
    async checkHighDelinquency(targetDate = new Date()) {
        this.logger.log(`🛡️ [CRON_DELINQUENCY] Iniciando escaneo de morosidad para fecha: ${targetDate.toDateString()}...`);
        const delinquentDrivers = await this.prisma.driver.findMany({
            where: {
                status: business_rules_1.BUSINESS_RULES.STATUS.DRIVER.ACTIVE,
                subscriptionPaid: false,
                subscriptionEnd: { lt: targetDate }
            },
            include: { devices: true }
        });
        if (delinquentDrivers.length === 0) {
            this.logger.log(`✅ No hay morosos críticos detectados para ${targetDate.toDateString()}.`);
            return;
        }
        this.logger.warn(`🛑 Detectados ${delinquentDrivers.length} choferes en mora crítica.`);
        await (0, throttler_util_1.throttledMap)(delinquentDrivers, async (driver) => {
            for (const device of driver.devices) {
                await this.notifyMorosidad(device.deviceId).catch(err => this.logger.error(`Error notifying morosidad for ${device.deviceId}: ${err.message}`));
            }
        }, 5);
    }
    async calculateMonthlyPayroll(month, year) {
        this.logger.log(`Calculating payroll for ${month}/${year}`);
        const activeCampaigns = await this.prisma.campaign.findMany({
            where: { status: 'ACTIVE', active: true }
        });
        const drivers = await this.prisma.driver.findMany({
            select: {
                id: true,
                fullName: true,
                phone: true,
                licensePlate: true,
                taxiNumber: true,
                subscriptionPaid: true,
                subscriptionEnd: true,
                devices: {
                    select: {
                        deviceId: true,
                        city: true,
                        taxiNumber: true,
                        campaigns: {
                            select: { campaign_id: true }
                        }
                    }
                },
                referrals: { select: { id: true } },
                referredAdvertisers: { select: { id: true } }
            }
        });
        const periodStart = new Date(year, month - 1, 1);
        const periodEnd = new Date(year, month, 0, 23, 59, 59);
        this.logger.log(`🔍 [OPTIMIZACIÓN] Pre-calculando conteos GPS y PoP para ${drivers.length} choferes...`);
        const [gpsCountsRaw, playbackEventsRaw] = await Promise.all([
            this.prisma.driverLocation.groupBy({
                by: ['driverId'],
                where: { timestamp: { gte: periodStart, lte: periodEnd } },
                _count: { _all: true }
            }),
            this.prisma.playbackEvent.findMany({
                where: {
                    timestamp: { gte: periodStart, lte: periodEnd },
                    eventType: 'play_confirm',
                    verified: true,
                },
                select: { deviceId: true, videoId: true },
                distinct: ['deviceId', 'videoId']
            })
        ]);
        const gpsCountsMap = new Map(gpsCountsRaw.map(item => [item.driverId, item._count._all]));
        const driverPoPMap = new Map();
        const mediaToCampaignRaw = await this.prisma.media.findMany({
            where: { campaign_id: { not: null } },
            select: { id: true, campaign_id: true }
        });
        const mediaToCampaignMap = new Map(mediaToCampaignRaw.map(m => [m.id, m.campaign_id]));
        const deviceToDriverMap = new Map();
        drivers.forEach(d => {
            d.devices?.forEach(dev => deviceToDriverMap.set(dev.deviceId, d.id));
        });
        playbackEventsRaw.forEach(evt => {
            const driverId = deviceToDriverMap.get(evt.deviceId);
            const campaignId = mediaToCampaignMap.get(evt.videoId);
            if (driverId && campaignId) {
                if (!driverPoPMap.has(driverId))
                    driverPoPMap.set(driverId, new Set());
                driverPoPMap.get(driverId).add(campaignId);
            }
        });
        const payroll = await (0, throttler_util_1.throttledMap)(drivers, async (driver) => {
            try {
                const gpsPointsCount = gpsCountsMap.get(driver.id) || 0;
                const playedCampaigns = driverPoPMap.get(driver.id) || new Set();
                const isSubPaid = driver.subscriptionPaid && (!driver.subscriptionEnd || new Date(driver.subscriptionEnd) >= new Date());
                const activeAdsCount = isSubPaid ? playedCampaigns.size : 0;
                const baseCommission = 0;
                const referrals = driver.referrals ? driver.referrals.length : 0;
                const driverReferralBonus = referrals * business_rules_1.BUSINESS_RULES.DRIVER_REFERRAL_BONUS_RD;
                const advertiserReferrals = driver.referredAdvertisers ? driver.referredAdvertisers.length : 0;
                const advertiserReferralBonus = advertiserReferrals * business_rules_1.BUSINESS_RULES.ADVERTISER_REFERRAL_BONUS_RD;
                const adTransmissionIncome = activeAdsCount * this.PAY_PER_AD;
                const totalAmount = adTransmissionIncome + driverReferralBonus + advertiserReferralBonus;
                const actualTaxiNumber = driver.devices?.[0]?.taxiNumber || driver.taxiNumber || 'S/N';
                const paymentRecord = await this.prisma.payrollPayment.findUnique({
                    where: { driverId_month_year: { driverId: driver.id, month, year } }
                });
                return {
                    driverId: driver.id,
                    driverName: driver.fullName || 'TAD DRIVER',
                    driverPhone: driver.phone || '',
                    taxiNumber: actualTaxiNumber,
                    activeAds: paymentRecord?.status === 'PAID' ? paymentRecord.activeAds : activeAdsCount,
                    adIncome: adTransmissionIncome,
                    baseCommission,
                    gpsPoints: paymentRecord?.status === 'PAID' ? paymentRecord.gpsPoints : gpsPointsCount,
                    referralBonus: driverReferralBonus,
                    advertiserReferralBonus,
                    totalAmount: paymentRecord?.status === 'PAID' ? paymentRecord.amount : totalAmount,
                    currency: 'DOP',
                    status: paymentRecord?.status || 'PENDING',
                    paidAt: paymentRecord?.paidAt,
                    reference: paymentRecord?.referenceNum
                };
            }
            catch (err) {
                this.logger.error(`CRITICAL: Failed to calculate payroll for driver ${driver.id}: ${err.message}`);
                return {
                    driverId: driver.id,
                    driverName: driver.fullName || 'ERROR',
                    driverPhone: driver.phone || '',
                    taxiNumber: 'ERR',
                    activeAds: 0,
                    adIncome: 0,
                    baseCommission: 0,
                    gpsPoints: 0,
                    referralBonus: 0,
                    advertiserReferralBonus: 0,
                    totalAmount: 0,
                    currency: 'DOP',
                    status: 'ERROR',
                    error: true
                };
            }
        }, 5);
        return payroll;
    }
    async triggerMonthlyBilling(month, year) {
        this.logger.log(`🚀 TRIGGER: Bulk billing generation for ${month}/${year}`);
        const existing = await this.prisma.payrollPayment.findFirst({
            where: { month, year }
        });
        if (existing) {
            this.logger.warn(`⚠️ Payroll for ${month}/${year} already exists. Aborting bulk trigger.`);
            return { success: false, message: 'La nómina para este periodo ya fue generada.', count: 0 };
        }
        const payrollData = await this.calculateMonthlyPayroll(month, year);
        const recordsToCreate = payrollData
            .filter(p => p.totalAmount > 0)
            .map(p => ({
            driverId: p.driverId,
            month,
            year,
            amount: p.totalAmount,
            status: 'PENDING',
        }));
        if (recordsToCreate.length === 0) {
            return { success: true, message: 'No se encontraron montos a liquidar para este periodo.', count: 0 };
        }
        let count = 0;
        await (0, throttler_util_1.throttledMap)(recordsToCreate, async (record) => {
            await this.prisma.payrollPayment.create({
                data: record
            });
            count++;
        }, 5);
        this.logger.log(`✅ Bulk billing completed: ${count} drivers credited.`);
        return { success: true, count };
    }
    async processPayment(driverId, month, year, reference) {
        this.logger.log(`Processing payment for driver ${driverId} - ${month}/${year}`);
        const payrollData = await this.calculateMonthlyPayroll(month, year);
        const driverEntry = payrollData.find(p => p.driverId === driverId);
        if (!driverEntry) {
            throw new Error('Driver not found for payroll calculation');
        }
        const payrollRecord = await this.prisma.payrollPayment.upsert({
            where: {
                driverId_month_year: { driverId, month, year }
            },
            update: {
                amount: driverEntry.totalAmount,
                referenceNum: reference,
                status: 'PAID',
                paidAt: new Date(),
                activeAds: driverEntry.activeAds,
                gpsPoints: driverEntry.gpsPoints
            },
            create: {
                driverId,
                month,
                year,
                amount: driverEntry.totalAmount,
                referenceNum: reference,
                status: 'PAID',
                paidAt: new Date(),
                activeAds: driverEntry.activeAds,
                gpsPoints: driverEntry.gpsPoints
            }
        });
        await this.recordTransaction({
            type: 'OUTGOING',
            category: 'OPEX_DRIVER_PAYOUT',
            amount: driverEntry.totalAmount,
            entityId: driverId,
            reference: reference || `PAY-${driverId.substring(0, 4)}-${month}-${year}`,
            note: `Liquidación de ${driverEntry.activeAds} anuncios para ${driverEntry.driverName}. Periodo: ${month}/${year}.`,
            status: 'COMPLETED'
        });
        return payrollRecord;
    }
    async getCampaignBillingReport() {
        this.logger.log('Generating campaign billing report');
        const campaigns = await this.prisma.campaign.findMany({
            select: {
                id: true,
                name: true,
                status: true,
                startDate: true,
                endDate: true,
                media: { select: { id: true, durationSeconds: true } },
                _count: { select: { devices: true } }
            }
        });
        this.logger.log('🔍 [OPTIMIZACIÓN] Pre-calculando impresiones totales...');
        const impressionCountsRaw = await this.prisma.playbackEvent.groupBy({
            by: ['videoId'],
            where: { eventType: 'play_confirm' },
            _count: { _all: true }
        });
        const impressionMap = new Map(impressionCountsRaw.map(i => [i.videoId, i._count._all]));
        const reports = campaigns.map((campaign) => {
            let totalImpressions = 0;
            campaign.media.forEach(m => {
                totalImpressions += impressionMap.get(m.id) || 0;
            });
            let monthlyRevenue = 0;
            campaign.media.forEach(media => {
                const duration = media.durationSeconds || 30;
                const blocks = Math.ceil(duration / 30);
                monthlyRevenue += blocks * business_rules_1.BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD;
            });
            const diffTime = Math.abs(campaign.endDate.getTime() - campaign.startDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const diffMonths = Math.max(1, Math.round(diffDays / 30.44));
            const totalRevenue = monthlyRevenue * diffMonths;
            return {
                campaignId: campaign.id,
                campaignName: campaign.name,
                totalImpressions,
                assignedTaxis: campaign._count.devices,
                estimatedRevenue: totalRevenue,
                status: campaign.status
            };
        });
        return reports;
    }
    async generateInvoiceHtml(campaignId) {
        const campaign = await this.prisma.campaign.findUnique({
            where: { id: campaignId },
            include: { advertiserRef: true, media: { select: mediaSafeSelect } }
        });
        if (!campaign)
            return null;
        const impressions = await this.prisma.playbackEvent.count({
            where: {
                videoId: { in: campaign.media.map(m => m.id) },
                eventType: 'play_confirm'
            }
        });
        let monthlyBase = 0;
        campaign.media.forEach(m => {
            const dur = m.durationSeconds || 30;
            const blocks = Math.ceil(dur / 30);
            monthlyBase += blocks * business_rules_1.BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD;
        });
        const diffTime = Math.abs(campaign.endDate.getTime() - campaign.startDate.getTime());
        const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)) || 1;
        const subtotal = monthlyBase * diffMonths;
        const taxes = subtotal * business_rules_1.BUSINESS_RULES.ITBIS_RATE;
        const total = subtotal + taxes;
        const invoiceData = {
            invoiceNumber: `INV-${campaign.id.substring(0, 8).toUpperCase()}`,
            date: new Date().toLocaleDateString('es-DO'),
            client: campaign.advertiserRef?.companyName || campaign.advertiser,
            email: campaign.advertiserRef?.email || 'N/A',
            campaign: campaign.name,
            period: `${campaign.startDate.toLocaleDateString('es-DO')} - ${campaign.endDate.toLocaleDateString('es-DO')}`,
            impressions,
            qty: diffMonths,
            unitPrice: monthlyBase,
            subtotal,
            taxes,
            total
        };
        return this.generateInvoiceTemplate(invoiceData);
    }
    sanitizeCsvField(field) {
        if (field == null)
            return '';
        let str = String(field);
        if (/^[=+\-@\t\r]/.test(str)) {
            str = "'" + str;
        }
        str = str.replace(/"/g, '""');
        if (/[",\n\r]/.test(str)) {
            str = `"${str}"`;
        }
        return str;
    }
    async exportPayrollCsv(month, year) {
        const data = await this.calculateMonthlyPayroll(month, year);
        let csv = 'ID Socio/TAD DRIVER,Nombre TAD DRIVER,Taxi,GPS Points,Referidos,Ads Activos,Ingresos Ads,Monto Liquidar\n';
        data.forEach(d => {
            const row = [
                d.driverId, d.driverName, d.taxiNumber || 'N/A', d.gpsPoints,
                `RD$ ${d.referralBonus}`, d.activeAds, `RD$ ${d.adIncome}`, `RD$ ${d.totalAmount}`
            ].map(f => this.sanitizeCsvField(f)).join(',');
            csv += `${row}\n`;
        });
        return csv;
    }
    async exportCampaignCsv(campaignId) {
        const campaign = await this.prisma.campaign.findUnique({
            where: { id: campaignId },
            include: { media: { select: mediaSafeSelect }, _count: { select: { devices: true } } }
        });
        if (!campaign)
            return 'Campaña no encontrada';
        const impressions = await this.prisma.playbackEvent.count({
            where: { videoId: { in: campaign.media.map(m => m.id) }, eventType: 'play_confirm' }
        });
        let monthlyBase = 0;
        campaign.media.forEach(m => {
            const dur = m.durationSeconds || 30;
            const blocks = Math.ceil(dur / 30);
            monthlyBase += blocks * business_rules_1.BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD;
        });
        const diffTime = Math.abs(campaign.endDate.getTime() - campaign.startDate.getTime());
        const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)) || 1;
        const total = monthlyBase * diffMonths;
        let csv = 'Detalle de Facturación - TAD DOOH\n';
        csv += `Campaña,${this.sanitizeCsvField(campaign.name)}\n`;
        csv += `Cliente,${this.sanitizeCsvField(campaign.advertiser)}\n`;
        csv += `Periodo,${this.sanitizeCsvField(campaign.startDate.toLocaleDateString())} - ${this.sanitizeCsvField(campaign.endDate.toLocaleDateString())}\n`;
        csv += `Meses,${this.sanitizeCsvField(diffMonths)}\n`;
        csv += `Impactos Totales,${this.sanitizeCsvField(impressions)}\n`;
        csv += `Monto Total,${this.sanitizeCsvField(`RD$ ${total}`)}\n\n`;
        const mediaRows = campaign.media.map(m => {
            const dur = m.durationSeconds || 30;
            const blocks = Math.ceil(dur / 30);
            return [
                m.id, m.originalFilename || m.filename || 'N/A', dur, blocks, `RD$ ${blocks * business_rules_1.BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD}`
            ].map(f => this.sanitizeCsvField(f)).join(',');
        });
        csv += 'ID Media,Nombre Media,Duración (s),Bloques 30s,Costo Mensual\n';
        mediaRows.forEach(row => { csv += `${row}\n`; });
        return csv;
    }
    async exportCampaignsCsv() {
        const data = await this.getCampaignBillingReport();
        let csv = 'ID Campaña,Nombre Campaña,Estado,Taxis Asignados,Impactos Reales,Ingreso Proyectado (RD$)\n';
        data.forEach(c => {
            const row = [
                c.campaignId, c.campaignName, c.status, c.assignedTaxis, c.totalImpressions, c.estimatedRevenue
            ].map(f => this.sanitizeCsvField(f)).join(',');
            csv += `${row}\n`;
        });
        return csv;
    }
    async recordTransaction(data) {
        this.logger.log(`Recording ${data.type} transaction for category: ${data.category}`);
        let taxAmount = 0;
        let netAmount = data.amount;
        if (data.category === 'SUSCRIPCION' || data.category === 'PUBLICIDAD') {
            taxAmount = (data.amount / (1 + this.ITBIS_RATE)) * this.ITBIS_RATE;
            netAmount = data.amount - taxAmount;
        }
        if (data.category === 'SUSCRIPCION' && data.entityId) {
            const driver = await this.prisma.driver.findUnique({
                where: { id: data.entityId },
                select: { referredBy: true }
            });
            if (driver?.referredBy) {
                this.logger.log(`Referral detected for driver ${data.entityId}. Applying retention logic.`);
                const referralBonus = netAmount * this.REFERRAL_RETENTION_RATE;
                netAmount -= referralBonus;
            }
        }
        return this.prisma.financialTransaction.create({
            data: {
                type: data.type,
                category: data.category,
                amount: data.amount,
                taxAmount,
                netAmount,
                entityId: data.entityId,
                reference: data.reference,
                note: data.note,
                status: data.status || 'COMPLETED'
            }
        });
    }
    async getFinancialSummary() {
        this.logger.log('Generating financial summary and projections');
        const activeSubscribedDrivers = await this.prisma.driver.count({
            where: { status: business_rules_1.BUSINESS_RULES.STATUS.DRIVER.ACTIVE, subscriptionPaid: true }
        });
        const mrr = activeSubscribedDrivers * this.RECURRING_SUB_BASE;
        const activeCampaigns = await this.prisma.campaign.findMany({
            where: { status: 'ACTIVE' },
            include: { media: { select: mediaSafeSelect } }
        });
        let campaignRevenue = 0;
        activeCampaigns.forEach(campaign => {
            let monthlyBase = 0;
            campaign.media.forEach(m => {
                const dur = m.durationSeconds || 30;
                const blocks = Math.ceil(dur / 30);
                monthlyBase += blocks * business_rules_1.BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD;
            });
            const diffTime = Math.abs(campaign.endDate.getTime() - campaign.startDate.getTime());
            const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)) || 1;
            campaignRevenue += monthlyBase * diffMonths;
        });
        const monthStart = new Date();
        monthStart.setDate(1);
        const monthlyExpenses = await this.prisma.financialTransaction.aggregate({
            where: {
                type: 'OUTGOING',
                createdAt: { gte: monthStart }
            },
            _sum: { amount: true }
        });
        const burnRate = monthlyExpenses._sum.amount || 0;
        return {
            mrr,
            campaignRevenue,
            burnRate,
            activeSubscribers: activeSubscribedDrivers,
            netProjection: mrr + campaignRevenue - burnRate,
            currency: 'DOP',
            timestamp: new Date()
        };
    }
    async getInvestorMetrics() {
        this.logger.log('Generating investor metrics (Unit Economics)');
        const totalMarketing = await this.prisma.financialTransaction.aggregate({
            where: { category: 'OPEX_MARKETING' },
            _sum: { amount: true }
        });
        const totalAdvertisers = await this.prisma.advertiser.count();
        const marketingSpend = totalMarketing._sum.amount || 0;
        const cac = totalAdvertisers > 0 ? marketingSpend / totalAdvertisers : 0;
        const revenues = await this.prisma.financialTransaction.aggregate({
            where: { category: { in: ['REVENUE_AD', 'REVENUE_SUBSCRIPTION'] } },
            _sum: { amount: true }
        });
        const opex = await this.prisma.financialTransaction.aggregate({
            where: { category: { in: ['OPEX_DRIVER_PAYOUT', 'OPEX_COMMISSION', 'OPEX_MARKETING'] } },
            _sum: { amount: true }
        });
        const totalRev = revenues._sum.amount || 0;
        const totalOpex = opex._sum.amount || 0;
        const ebitda = totalRev - totalOpex;
        const activeTaxis = await this.prisma.device.count({ where: { status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.ACTIVE } });
        const monthsActive = 12;
        const monthlyRevPerTaxi = activeTaxis > 0 ? (totalRev / monthsActive) / activeTaxis : 0;
        const monthlyOpexPerTaxi = activeTaxis > 0 ? (totalOpex / monthsActive) / activeTaxis : 0;
        const ltv = monthlyRevPerTaxi * 24;
        const netMonthlyPerTaxi = monthlyRevPerTaxi - monthlyOpexPerTaxi;
        const paybackPeriod = netMonthlyPerTaxi > 0 ? business_rules_1.BUSINESS_RULES.STARTER_KIT_ANNUAL_FEE_RD / netMonthlyPerTaxi : 999;
        return {
            cac: cac.toFixed(2),
            ltv: ltv.toFixed(2),
            paybackPeriod: paybackPeriod.toFixed(1),
            ebitda: ebitda.toFixed(2),
            activeTaxis,
            monthlyRevPerTaxi: monthlyRevPerTaxi.toFixed(2),
            monthlyOpexPerTaxi: monthlyOpexPerTaxi.toFixed(2),
            hardwareCostPerUnit: business_rules_1.BUSINESS_RULES.STARTER_KIT_ANNUAL_FEE_RD,
            currency: 'DOP',
            generatedAt: new Date()
        };
    }
    async getLedger() {
        return this.prisma.financialTransaction.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50
        });
    }
    generateInvoiceTemplate(data) {
        return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Factura ${data.invoiceNumber} - TAD DOOH</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        :root { --tad-yellow: #FFD400; --bg: #0a0a0a; --card: #141414; }
        body { font-family: 'Outfit', sans-serif; background: var(--bg); color: #fff; margin: 0; padding: 40px; line-height: 1.6; }
        .invoice-box { max-width: 900px; margin: auto; padding: 50px; background: var(--card); border: 1px solid #222; border-radius: 32px; box-shadow: 0 40px 100px rgba(0,0,0,0.8); position: relative; overflow: hidden; }
        .invoice-box::before { content: ''; position: absolute; top: 0; right: 0; width: 300px; h-8; background: var(--tad-yellow); clip-path: polygon(100% 0, 0 0, 100% 100%); opacity: 0.1; }
        
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 60px; position: relative; z-index: 10; }
        .logo-section h1 { font-size: 48px; font-weight: 900; margin: 0; letter-spacing: -2px; color: var(--tad-yellow); line-height: 1; }
        .logo-section h1 span { color: #fff; }
        .logo-section p { margin: 10px 0 0 0; color: #666; font-weight: 700; letter-spacing: 2px; font-size: 10px; text-transform: uppercase; }

        .meta-section { text-align: right; }
        .meta-section h2 { font-size: 24px; font-weight: 900; margin: 0; color: #fff; }
        .meta-section p { margin: 5px 0; color: #888; font-size: 14px; font-weight: 700; }
        .status-badge { display: inline-block; padding: 8px 16px; background: #FFD4001a; color: var(--tad-yellow); border: 1px solid #FFD40033; border-radius: 12px; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-top: 15px; }

        .client-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 60px; }
        .client-block h3 { font-size: 12px; color: #444; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px; border-bottom: 1px solid #222; padding-bottom: 5px; }
        .client-block p { margin: 0; font-size: 18px; font-weight: 700; color: #eee; }
        .client-block .small { font-size: 14px; color: #777; font-weight: 400; margin-top: 5px; }

        table { width: 100%; border-collapse: separate; border-spacing: 0 10px; margin-bottom: 60px; }
        th { text-align: left; padding: 15px 20px; color: #444; text-transform: uppercase; font-size: 11px; font-weight: 800; border-bottom: 1px solid #222; }
        td { padding: 25px 20px; background: #1a1a1a; font-size: 16px; border-top: 1px solid #222; border-bottom: 1px solid #222; }
        td:first-child { border-left: 1px solid #222; border-radius: 16px 0 0 16px; font-weight: 700; }
        td:last-child { border-right: 1px solid #222; border-radius: 0 16px 16px 0; text-align: right; font-weight: 900; color: var(--tad-yellow); }
        .description-sub { font-size: 12px; color: #555; display: block; margin-top: 5px; }

        .bottom-section { display: flex; justify-content: space-between; align-items: flex-end; }
        .payment-info { color: #555; font-size: 12px; max-width: 400px; }
        .payment-info h4 { color: #888; margin-bottom: 10px; font-size: 14px; }

        .totals { width: 350px; background: #1a1a1a; padding: 30px; border-radius: 24px; border: 1px solid #222; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; color: #888; }
        .total-row.grand { margin-top: 20px; padding-top: 20px; border-top: 1px solid #333; font-size: 32px; font-weight: 900; color: var(--tad-yellow); }

        .footer { margin-top: 80px; text-align: center; color: #333; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; }

        @media print {
            body { padding: 0; background: #fff; color: #000; }
            .invoice-box { box-shadow: none; border: none; padding: 20px; background: #fff; }
            td, .totals { background: #f9f9f9; color: #000; border-color: #eee; }
            .total-row.grand, .logo-section h1 { color: #000 !important; }
            th { color: #888; }
        }
    </style>
</head>
<body>
    <div class="invoice-box">
        <div class="header">
            <div class="logo-section">
                <h1>TAD<span>DOOH</span></h1>
                <p>Digital Out Of Home Advertising</p>
            </div>
            <div class="meta-section">
                <h2>Comprobante Fiscal</h2>
                <p>ID: ${data.invoiceNumber}</p>
                <p>Emitido: ${data.date}</p>
                <div class="status-badge">Auditoría Aprobada</div>
            </div>
        </div>

        <div class="client-grid">
            <div class="client-block">
                <h3>Prestador</h3>
                <p>TAD Advertising SRL</p>
                <p class="small">RNC: 132-45678-9<br>Calle Central #45, Santo Domingo, RD</p>
            </div>
            <div class="client-block" style="text-align: right">
                <h3>Receptor</h3>
                <p>${data.client}</p>
                <p class="small">${data.email || 'contacto@cliente.com'}<br>Periodo: ${data.period}</p>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Concepto de Pauta</th>
                    <th style="text-align: center">Ciclos</th>
                    <th style="text-align: right">Impactos</th>
                    <th style="text-align: right">Total (DOP)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        ${data.campaign}
                        <span class="description-sub">Servicio de exhibición publicitaria en flota TAD taxis</span>
                    </td>
                    <td style="text-align: center">${data.qty} Mes(es)</td>
                    <td style="text-align: right">${data.impressions.toLocaleString()}</td>
                    <td style="text-align: right">RD$ ${data.total.toLocaleString()}</td>
                </tr>
            </tbody>
        </table>

        <div class="bottom-section">
            <div class="payment-info">
                <h4>Detalles de Transferencia</h4>
                <p>Banco Popular Dominicano<br>Cuenta Corriente: 802-XXXXXXX<br>Beneficiario: TAD Advertising SRL</p>
                <p style="margin-top: 20px">* Este documento es un reporte de auditoría fiscal generado automáticamente por el sistema de inteligencia financiera de TAD.</p>
            </div>
            <div class="totals">
                <div class="total-row">
                    <span>Monto Base</span>
                    <span>RD$ ${data.subtotal.toLocaleString()}</span>
                </div>
                <div class="total-row">
                    <span>ITBIS (18%)</span>
                    <span>RD$ ${data.taxes.toLocaleString()}</span>
                </div>
                <div class="total-row grand">
                    <span>RD$ ${data.total.toLocaleString()}</span>
                </div>
            </div>
        </div>

        <div class="footer">
            TAD Platform v5.2 - Intelligence & Performance Reporting
        </div>
    </div>
</body>
</html>
    `;
    }
};
exports.FinanceService = FinanceService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_3AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Date]),
    __metadata("design:returntype", Promise)
], FinanceService.prototype, "checkHighDelinquency", null);
exports.FinanceService = FinanceService = FinanceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        invoice_service_1.InvoiceService,
        whatsapp_service_1.WhatsAppService,
        email_service_1.EmailService])
], FinanceService);
//# sourceMappingURL=finance.service.js.map