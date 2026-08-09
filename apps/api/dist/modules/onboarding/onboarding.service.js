"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OnboardingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const business_rules_1 = require("../../common/constants/business-rules");
let OnboardingService = OnboardingService_1 = class OnboardingService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(OnboardingService_1.name);
    }
    async onboardAdvertiser(data) {
        const { name, companyName, email, phone, password, budget, expectedScreens, fileMetadata } = data;
        const existing = await this.prisma.advertiser.findUnique({ where: { email } });
        if (existing) {
            throw new common_1.ConflictException('Este correo electrónico ya está registrado.');
        }
        try {
            return await this.prisma.$transaction(async (tx) => {
                const hashedPassword = await bcrypt.hash(password, business_rules_1.BCRYPT_ROUNDS);
                const advertiser = await tx.advertiser.create({
                    data: {
                        companyName,
                        contactName: name,
                        email,
                        phone,
                        password: hashedPassword,
                        status: 'ACTIVE',
                    },
                });
                const campaign = await tx.campaign.create({
                    data: {
                        name: `Lanzamiento - ${companyName}`,
                        advertiser: companyName,
                        advertiserId: advertiser.id,
                        budget: Number(budget),
                        targetImpressions: Number(expectedScreens) * 12500,
                        startDate: new Date(),
                        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
                        status: business_rules_1.BUSINESS_RULES.STATUS.CAMPAIGN.PENDING_PAYMENT,
                        active: false,
                        hasSeenTutorial: true,
                        category: 'General',
                        targetCity: data.targetCity,
                    },
                });
                if (fileMetadata) {
                    await tx.video.create({
                        data: {
                            campaignId: campaign.id,
                            title: fileMetadata.name,
                            url: 'PENDING_UPLOAD',
                            duration: 30,
                            fileSize: fileMetadata.size,
                            mimeType: fileMetadata.type,
                        },
                    });
                }
                this.logger.log(`✅ Onboarding exitoso: ${email} (${advertiser.id})`);
                return {
                    advertiserId: advertiser.id,
                    campaignId: campaign.id,
                    companyName: advertiser.companyName,
                };
            });
        }
        catch (error) {
            this.logger.error(`❌ Error en transacción de onboarding: ${error.message}`);
            if (error instanceof common_1.ConflictException)
                throw error;
            throw new common_1.InternalServerErrorException('Error al procesar el registro. Intente de nuevo.');
        }
    }
};
exports.OnboardingService = OnboardingService;
exports.OnboardingService = OnboardingService = OnboardingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OnboardingService);
//# sourceMappingURL=onboarding.service.js.map