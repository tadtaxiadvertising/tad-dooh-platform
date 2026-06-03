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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ReferralService = class ReferralService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generate(driverId) {
        const driver = await this.prisma.driver.findUnique({
            where: { id: driverId },
            select: { referralCode: true }
        });
        if (!driver)
            throw new common_1.NotFoundException('Driver not found');
        const code = driver.referralCode;
        const url = `https://tad-advertiser.rewvid.easypanel.host/register?ref=${code}`;
        return {
            driverId,
            referralCode: code,
            url,
            qrPayload: url
        };
    }
    async getStats() {
        const topRecruiters = await this.prisma.driver.findMany({
            where: { referrals: { some: {} } },
            select: {
                id: true,
                fullName: true,
                referralCode: true,
                _count: {
                    select: { referrals: true }
                }
            },
            orderBy: { referrals: { _count: 'desc' } },
            take: 10
        });
        const totalReferrals = await this.prisma.driver.count({
            where: { referredBy: { not: null } }
        });
        const pendingCommissions = await this.prisma.commission.aggregate({
            where: { status: 'PENDING', sourceType: 'DRIVER_REFERRAL' },
            _sum: { amount: true }
        });
        return {
            topRecruiters,
            totalReferrals,
            pendingCommissions: pendingCommissions._sum.amount || 0
        };
    }
    async getNetwork() {
        return this.prisma.driver.findMany({
            where: { referredBy: { not: null } },
            select: {
                id: true,
                fullName: true,
                referredBy: true,
                createdAt: true,
                status: true,
                referredByDriver: {
                    select: {
                        fullName: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
};
exports.ReferralService = ReferralService;
exports.ReferralService = ReferralService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReferralService);
//# sourceMappingURL=referral.service.js.map