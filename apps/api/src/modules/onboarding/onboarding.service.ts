// apps/api/src/modules/onboarding/onboarding.service.ts
import {
  Injectable,
  Logger,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  ForbiddenException,
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
import { OnboardAdvertiserQuoteDto } from "./dto/onboard-advertiser-quote.dto";
import { CompleteOAuthAdvertiserProfileDto } from "./dto/complete-oauth-advertiser-profile.dto";
import { calculateAdvertiserOffer } from "@tad/impact-calculator";

@Injectable()
// TAD DOOH v12.1 - Atomic Onboarding (30s Frequency Policy)
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
  ) {}

  /**
   * Price decisions are based solely on a driver actually found in PostgreSQL.
   * Never trust "discount", "eligible" or "budget" fields submitted by clients.
   */
  private async verifiedOffer(data: OnboardAdvertiserQuoteDto) {
    const { referralCode, expectedScreens, campaignMonths, includeProduction } =
      data;
    if (
      !Number.isSafeInteger(expectedScreens) ||
      expectedScreens < 1 ||
      expectedScreens > 100 ||
      !Number.isSafeInteger(campaignMonths ?? 1) ||
      (campaignMonths ?? 1) < 1 ||
      (campaignMonths ?? 1) > 12 ||
      (includeProduction !== undefined &&
        typeof includeProduction !== "boolean")
    ) {
      throw new BadRequestException("Configuración de campaña no válida.");
    }
    if (
      referralCode !== undefined &&
      (typeof referralCode !== "string" ||
        !/^[A-Za-z0-9_-]{1,64}$/.test(referralCode))
    ) {
      throw new BadRequestException("Código de conductor no válido.");
    }
    const referrer = referralCode
      ? await this.prisma.driver.findUnique({
          where: { referralCode },
          // Simulated/test fleet records cannot unlock financial offers.
          select: { id: true, isSimulated: true },
        })
      : null;
    if (referralCode && (!referrer || referrer.isSimulated)) {
      throw new BadRequestException("Código de conductor no válido.");
    }

    return {
      referrerId: referrer?.id ?? null,
      quote: calculateAdvertiserOffer({
        screens: expectedScreens,
        months: campaignMonths ?? 1,
        includeProduction: includeProduction ?? false,
        verifiedDriverCode: Boolean(referrer),
      }),
    };
  }

  async quoteAdvertiser(data: OnboardAdvertiserQuoteDto) {
    const { quote } = await this.verifiedOffer(data);
    return quote;
  }

  async onboardAdvertiser(data: OnboardAdvertiserDto) {
    const {
      name,
      companyName,
      phone,
      password,
      budget,
      expectedScreens,
      targetCity,
      campaignMonths,
      includeProduction,
    } = data;

    // Normalize identity consistently across Prisma and Supabase Auth.
    // This also protects internal callers that bypass DTO validation.
    const email =
      typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    if (!isEmail(email)) {
      throw new BadRequestException("El correo electrónico no es válido.");
    }

    if (typeof password !== "string" || password.length < 8) {
      throw new BadRequestException(
        "La contraseña debe tener al menos 8 caracteres.",
      );
    }

    // Also validate at the service boundary (jobs/internal callers bypass HTTP DTO validation).
    if (typeof budget !== "number" || !Number.isFinite(budget) || budget <= 0) {
      throw new BadRequestException(
        "El presupuesto debe ser un número positivo.",
      );
    }
    if (
      typeof expectedScreens !== "number" ||
      !Number.isInteger(expectedScreens) ||
      expectedScreens < 1
    ) {
      throw new BadRequestException(
        "La cantidad de pantallas debe ser un entero positivo.",
      );
    }

    // Resolve and price the offer BEFORE identity provisioning; invalid codes
    // must not create a Supabase user or a campaign.
    const { referrerId, quote } = await this.verifiedOffer(data);

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

    // Only an explicitly rejected transaction callback proves that this
    // request did not complete its database work. A rejected COMMIT response
    // can instead mean the transaction committed but acknowledgement was lost.
    let transactionWorkFailed = false;
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        try {
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
              referredBy: referrerId,
            },
          });

          // 2. Create Initial Campaign (as an "Intent" or actual Campaign)
          const months = campaignMonths ?? 1;
          const targetImpressions = expectedScreens * 12500; // Estimación basada en screens
          const campaign = await tx.campaign.create({
            data: {
              name: `Lanzamiento - ${companyName}`,
              advertiser: companyName,
              advertiserId: advertiser.id,
              // Persist the authoritative pre-tax estimate, not a client budget.
              budget: quote.subtotal,
              targetImpressions,
              startDate: new Date(),
              endDate: new Date(
                new Date().setMonth(new Date().getMonth() + months),
              ),
              status: BUSINESS_RULES.STATUS.CAMPAIGN.PENDING_PAYMENT,
              active: false, // Inactiva hasta que se pague
              hasSeenTutorial: true,
              category: "General",
              targetCity: targetCity,
              // Se respeta la duración declarada por el anunciante
              campaignMonths: months,
              includeProduction: includeProduction ?? false,
            },
          });

          // 3. Register Video Metadata (The actual file upload happens on frontend to storage)
          if (data.fileMetadata) {
            await tx.video.create({
              data: {
                campaignId: campaign.id,
                title: data.fileMetadata.name,
                url: "PENDING_UPLOAD", // Placeholder, the frontend will handle upload to storage
                duration: 30, // Default duration per slot
                fileSize: data.fileMetadata.size,
                mimeType: data.fileMetadata.type,
              },
            });
          }

          return {
            advertiserId: advertiser.id,
            campaignId: campaign.id,
            companyName: advertiser.companyName,
            quote,
          };
        } catch (error) {
          transactionWorkFailed = true;
          throw error;
        }
      });
      this.logger.log(
        `[ADVERTISER_ONBOARDING_COMMITTED] advertiserId=${result.advertiserId}`,
      );
      return result;
    } catch (error) {
      // Never delete the new identity when the transaction outcome is unknown.
      // Preserve the Auth user for a privileged reconciliation with PostgreSQL.
      if (!transactionWorkFailed) {
        this.logger.error(
          `[ADVERTISER_ONBOARDING_RECONCILIATION_REQUIRED] authUserId=${createdAuthUserId} reason=transaction_outcome_unknown`,
        );
        throw new InternalServerErrorException(
          "No pudimos confirmar el registro. Verifica el estado de tu solicitud antes de volver a registrarte.",
        );
      }

      try {
        const { error: cleanupError } = await this.supabaseService
          .getClient()
          .auth.admin.deleteUser(createdAuthUserId);
        if (cleanupError) {
          this.logger.error(
            `[ADVERTISER_ONBOARDING_RECONCILIATION_REQUIRED] authUserId=${createdAuthUserId} reason=auth_cleanup_failed`,
          );
        }
      } catch {
        this.logger.error(
          `[ADVERTISER_ONBOARDING_RECONCILIATION_REQUIRED] authUserId=${createdAuthUserId} reason=auth_cleanup_unavailable`,
        );
      }
      this.logger.error("Advertiser onboarding transaction failed");
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new InternalServerErrorException(
        "Error al procesar el registro. Intente de nuevo.",
      );
    }
  }

  /**
   * Idempotent PROFILE completion for an EXISTING verified Google OAuth
   * advertiser. This is not commercial approval, campaign creation, or payment.
   * Only PENDING_ONBOARDING can advance to PENDING_REVIEW.
   *
   * The identity is injected by the API's global authentication guard.
   */
  async completeOAuthAdvertiserProfile(
    identity: { role?: string; entityId?: string | null; email?: string },
    data: CompleteOAuthAdvertiserProfileDto,
  ) {
    if (
      identity?.role !== "ADVERTISER" ||
      typeof identity.entityId !== "string" ||
      !identity.entityId.trim() ||
      typeof identity.email !== "string" ||
      !identity.email.trim()
    ) {
      throw new UnauthorizedException("Sesión de anunciante inválida.");
    }

    const companyName =
      typeof data?.companyName === "string" ? data.companyName.trim() : "";
    const contactName =
      typeof data?.contactName === "string" ? data.contactName.trim() : "";
    const phone =
      data?.phone === undefined
        ? undefined
        : typeof data.phone === "string"
          ? data.phone.trim()
          : "";
    if (
      companyName.length < 2 ||
      companyName.length > 120 ||
      contactName.length < 2 ||
      contactName.length > 120 ||
      (phone !== undefined && !/^[+0-9 ()-]{7,25}$/.test(phone))
    ) {
      throw new BadRequestException("Los datos del perfil no son válidos.");
    }

    const where = { id: identity.entityId };
    const advertiser = await this.prisma.advertiser.findUnique({
      where,
      select: { id: true, email: true, status: true },
    });
    if (
      !advertiser ||
      advertiser.id !== identity.entityId ||
      advertiser.email.trim().toLowerCase() !==
        identity.email.trim().toLowerCase()
    ) {
      throw new UnauthorizedException("Sesión de anunciante inválida.");
    }
    if (advertiser.status === "PENDING_REVIEW") {
      // Safe retry: never create another identity or overwrite a submitted
      // profile. Approval remains reserved for an authorized operator.
      return { advertiserId: advertiser.id, status: "PENDING_REVIEW" as const };
    }
    if (advertiser.status !== "PENDING_ONBOARDING") {
      throw new ForbiddenException(
        "Esta cuenta no requiere completar el perfil.",
      );
    }

    const result = await this.prisma.advertiser.updateMany({
      where: { id: advertiser.id, status: "PENDING_ONBOARDING" },
      data: {
        companyName,
        contactName,
        ...(phone !== undefined ? { phone } : {}),
        status: "PENDING_REVIEW",
      },
    });
    if (result.count === 1) {
      return { advertiserId: advertiser.id, status: "PENDING_REVIEW" as const };
    }

    // Concurrent identical requests must not create duplicated accounts.
    const latest = await this.prisma.advertiser.findUnique({
      where,
      select: { status: true },
    });
    if (latest?.status === "PENDING_REVIEW") {
      return { advertiserId: advertiser.id, status: "PENDING_REVIEW" as const };
    }
    throw new ConflictException(
      "El estado de la cuenta cambió. Vuelve a iniciar sesión.",
    );
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
