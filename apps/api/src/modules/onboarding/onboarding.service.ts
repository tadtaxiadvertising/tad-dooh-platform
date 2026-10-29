// apps/api/src/modules/onboarding/onboarding.service.ts
import {
  Injectable,
  Logger,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";
import {
  BCRYPT_ROUNDS,
  BUSINESS_RULES,
} from "../../common/constants/business-rules";

import { OnboardAdvertiserDto } from "./dto/onboard-advertiser.dto";

@Injectable()
// TAD DOOH v12.1 - Atomic Onboarding (30s Frequency Policy)
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(private prisma: PrismaService) {}

  async onboardAdvertiser(data: OnboardAdvertiserDto) {
    const {
      name,
      companyName,
      email,
      phone,
      password,
      budget,
      expectedScreens,
      fileMetadata,
    } = data;

    if (typeof password !== "string" || password.length < 8) {
      throw new BadRequestException("La contraseña debe tener al menos 8 caracteres.");
    }

    // Also validate at the service boundary (jobs/internal callers bypass HTTP DTO validation).
    if (typeof budget !== "number" || !Number.isFinite(budget) || budget <= 0) {
      throw new BadRequestException("El presupuesto debe ser un número positivo.");
    }
    if (typeof expectedScreens !== "number" || !Number.isInteger(expectedScreens) || expectedScreens < 1) {
      throw new BadRequestException("La cantidad de pantallas debe ser un entero positivo.");
    }

    // Check if email already exists
    const existing = await this.prisma.advertiser.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException(
        "Este correo electrónico ya está registrado.",
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Create Advertiser
        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const advertiser = await tx.advertiser.create({
          data: {
            companyName,
            contactName: name,
            email,
            phone,
            password: hashedPassword,
            // NUEVO: Status de onboarding — no ACTIVE directo
            // Permite al dashboard detectar onboarding incompleto
            status: "PENDING_REVIEW",
          },
        });

        // 2. Create Initial Campaign (as an "Intent" or actual Campaign)
        const campaign = await tx.campaign.create({
          data: {
            name: `Lanzamiento - ${companyName}`,
            advertiser: companyName,
            advertiserId: advertiser.id,
            budget: Number(budget),
            targetImpressions: Number(expectedScreens) * 12500, // Estimación basada en screens
            startDate: new Date(),
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            status: BUSINESS_RULES.STATUS.CAMPAIGN.PENDING_PAYMENT,
            active: false, // Inactiva hasta que se pague
            hasSeenTutorial: true,
            category: "General",
            targetCity: data.targetCity,
          },
        });

        // 3. Register Video Metadata (The actual file upload happens on frontend to storage)
        if (fileMetadata) {
          await tx.video.create({
            data: {
              campaignId: campaign.id,
              title: fileMetadata.name,
              url: "PENDING_UPLOAD", // Placeholder, the frontend will handle upload to storage
              duration: 30, // Default duration per slot
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
    } catch (error) {
      this.logger.error(
        `❌ Error en transacción de onboarding: ${error.message}`,
      );
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException(
        "Error al procesar el registro. Intente de nuevo.",
      );
    }
  }

  /**
   * Completar onboarding: marcar advertiser como ACTIVE tras finalizar wizard
   */
  async completeOnboarding(advertiserId: string) {
    const advertiser = await this.prisma.advertiser.findUnique({
      where: { id: advertiserId },
    });
    if (!advertiser) throw new Error("Anunciante no encontrado");

    if (advertiser.status === "ACTIVE") {
      return { advertiserId, status: "ACTIVE", message: "Ya estaba activo" };
    }

    return this.prisma.advertiser.update({
      where: { id: advertiserId },
      data: { status: "ACTIVE" },
    });
  }
}
