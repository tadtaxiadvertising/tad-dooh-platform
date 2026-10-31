// apps/api/src/modules/onboarding/onboarding.service.ts
import {
  Injectable,
  Logger,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SupabaseService } from "../supabase/supabase.service";
import * as bcrypt from "bcrypt";
import { isEmail } from "class-validator";
import {
  BCRYPT_ROUNDS,
  BUSINESS_RULES,
} from "../../common/constants/business-rules";

import { OnboardAdvertiserDto } from "./dto/onboard-advertiser.dto";

@Injectable()
// TAD DOOH v12.1 - Atomic Onboarding (30s Frequency Policy)
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
  ) {}

  async onboardAdvertiser(data: OnboardAdvertiserDto) {
    const {
      name,
      companyName,
      phone,
      password,
      budget,
      expectedScreens,
      fileMetadata,
    } = data;

    // Normalize identity consistently across Prisma and Supabase Auth.
    // This also protects internal callers that bypass DTO validation.
    const email = typeof data.email === "string"
      ? data.email.trim().toLowerCase()
      : "";
    if (!isEmail(email)) {
      throw new BadRequestException("El correo electrónico no es válido.");
    }

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

    // Create a unique Supabase Auth identity before the Prisma transaction.
    // Never reuse or overwrite an existing identity: this is a public endpoint.
    const { data: provisioned, error: provisionError } =
      await this.supabaseService.getClient().auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        app_metadata: { role: "ADVERTISER" },
      });
    if (provisionError || !provisioned?.user?.id) {
      this.logger.warn("Advertiser Auth provisioning failed");
      throw new ConflictException(
        "No se pudo crear la identidad. Verifica si el correo ya está registrado.",
      );
    }
    const createdAuthUserId = provisioned.user.id;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
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
      return result;
    } catch (error) {
      // A rejected transaction may already have committed (e.g. a network
      // timeout after COMMIT). Never delete an Auth identity until Prisma
      // confirms that no advertiser was persisted for this email.
      let confirmedAbsent = false;
      try {
        const persisted = await this.prisma.advertiser.findUnique({
          where: { email },
          select: { id: true },
        });
        confirmedAbsent = persisted === null;
        if (!confirmedAbsent) {
          this.logger.error(
            "CRITICAL: advertiser transaction outcome ambiguous; Auth identity retained for reconciliation",
          );
        }
      } catch {
        this.logger.error(
          "CRITICAL: advertiser persistence check unavailable; Auth identity retained for reconciliation",
        );
      }

      if (confirmedAbsent) {
        // Compensate only the Auth identity created by this request.
        // Never clean up when the database outcome cannot be verified.
        try {
          const { error: cleanupError } = await this.supabaseService
            .getClient().auth.admin.deleteUser(createdAuthUserId);
          if (cleanupError) {
            this.logger.error("CRITICAL: orphaned advertiser Auth identity; manual reconciliation required");
          }
        } catch {
          this.logger.error("CRITICAL: Auth cleanup unavailable; manual reconciliation required");
        }
      }
      this.logger.error("Advertiser onboarding transaction failed");
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
