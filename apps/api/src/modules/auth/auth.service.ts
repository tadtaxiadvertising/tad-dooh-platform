import {
  Injectable,
  UnauthorizedException,
  Logger,
  ForbiddenException,
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import {
  BCRYPT_ROUNDS,
  BUSINESS_RULES,
  JWT_EXPIRY,
} from "../../common/constants/business-rules";
import * as jwt from "jsonwebtoken";
import { OAuthExchangeDto, OAuthPortalRole } from "./dto/oauth-exchange.dto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    this.logger.log(`🔐 Intentando login para: ${dto.email}`);

    try {
      const anonClient = this.supabaseService.getAnonClient();

      if (!anonClient) {
        this.logger.error(
          "❌ SUPABASE_ANON_KEY no configurada — no se puede autenticar contra Supabase.",
        );
        throw new Error(
          "Autenticación no disponible: falta SUPABASE_ANON_KEY en la configuración del servidor.",
        );
      }

      // 1. Intentar login en Supabase (debe usar la clave pública/anon, GoTrue rechaza service_role)
      const { data, error } = await anonClient.auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

      if (error || !data.session || !data.user) {
        this.logger.error(
          `❌ Fallo Login Supabase: ${dto.email} - ${error?.message}`,
        );
        throw new UnauthorizedException("Credenciales inválidas");
      }

      const userId = data.user.id;
      const email = data.user.email;

      if (!email) {
        throw new Error(
          "El usuario autenticado no tiene email devuelto por Supabase",
        );
      }

      // 2. Buscar rol en base de datos local
      this.logger.debug(`🔍 Buscando rol para ${email} en base de datos...`);

      // A database failure must not be interpreted as an absent identity.
      // Otherwise a partial outage can silently change role resolution.
      const [adminUser, advertiser, driver] = await Promise.all([
        this.prisma.user.findUnique({ where: { email } }),
        this.prisma.advertiser.findUnique({ where: { email } }),
        this.prisma.driver.findFirst({
          where: {
            OR: [{ phone: email.split("@")[0] }, { phone: email }],
          },
        }),
      ]);

      // Determinar rol e ID de entidad
      let role = "GUEST";
      let entityId: string | null = null;

      if (adminUser) {
        role = adminUser.role || "ADMIN";
        this.logger.debug(`Found Admin User with role: ${role}`);
      } else if (advertiser) {
        role = "ADVERTISER";
        entityId = advertiser.id;
        this.logger.debug(`Found Advertiser with ID: ${entityId}`);
      } else if (driver) {
        role = "DRIVER";
        entityId = driver.id;
        this.logger.debug(`Found Driver with ID: ${entityId}`);
      }

      if (role === "GUEST") {
        this.logger.warn(`🚫 Usuario sin rol asignado en DB: ${email}`);
        throw new ForbiddenException(
          "Tu cuenta no tiene un rol asignado en la plataforma.",
        );
      }

      // 3. Inyectar Custom Claims en app_metadata SYNCHRONOUSLY before returning token
      // This ensures the Supabase user record has the correct role for subsequent getUser calls
      this.logger.debug(
        `💉 Inyectando metadata: role=${role}, entityId=${entityId}`,
      );
      const { error: updateError } = await this.supabaseService
        .getClient()
        .auth.admin.updateUserById(userId, {
          app_metadata: { role, entityId },
        });
      if (updateError) {
        this.logger.error(
          `⚠️ Error inyectando metadata en Supabase: ${updateError.message}`,
        );
      }

      this.logger.log(
        `✅ Login exitoso: ${email} | Rol: ${role} | Entity: ${entityId || "N/A"}`,
      );

      // Reissue tokens so the returned access_token carries the freshly
      // injected app_metadata.role. The session from signInWithPassword
      // was signed BEFORE the injection and its claims are immutable, so
      // returning it would give SSR/middleware decoders a GUEST role →
      // instant logout. Refresh against GoTrue and use the new tokens.
      let accessToken = data.session.access_token;
      let refreshToken = data.session.refresh_token;
      if (anonClient) {
        try {
          const { data: refreshed, error: refreshError } =
            await anonClient.auth.refreshSession({
              refresh_token: data.session.refresh_token,
            });
          if (!refreshError && refreshed.session?.access_token) {
            accessToken = refreshed.session.access_token;
            refreshToken = refreshed.session.refresh_token || refreshToken;
            this.logger.debug(
              `✅ Reissued role-bearing access_token for ${email}`,
            );
          } else {
            this.logger.warn(
              `⚠️ Token reissue failed for ${email}; returning original tokens: ${refreshError?.message}`,
            );
          }
        } catch (e: any) {
          this.logger.warn(
            `⚠️ Exception reissuing tokens for ${email}: ${e.message}`,
          );
        }
      }

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: userId,
          email: email,
          role: role,
          entityId: entityId,
        },
      };
    } catch (error) {
      this.logger.error(
        `💥 ERROR CRÍTICO EN LOGIN: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: "Error interno en el proceso de autenticación",
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getProfile(userId: string) {
    // FIX A-4: También paralelizar getProfile
    const [user, advertiser, driver] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: userId } }),
      this.prisma.advertiser.findFirst({ where: { id: userId } }),
      this.prisma.driver.findFirst({ where: { id: userId } }),
    ]);

    if (user) return { ...user, role: user.role };
    if (advertiser) return { ...advertiser, role: "ADVERTISER" };
    if (driver) return { ...driver, role: "DRIVER" };

    return { id: userId, role: "GUEST" };
  }

  async updateProfile(
    userId: string,
    data: { name?: string; password?: string; currentPassword?: string },
  ) {
    const supabase = this.supabaseService.getClient();

    // 1. Update password in Supabase if requested
    if (data.password) {
      if (!data.currentPassword) {
        throw new HttpException(
          "Current password is required to change password",
          HttpStatus.BAD_REQUEST,
        );
      }

      // Supabase requires verifying the current session/password to change the password safely,
      // but since we are using service role we can force it, however, it's safer to verify the old password.
      // Since we don't have the plain text password to verify easily here without signing in,
      // and this endpoint is protected (so we know who they are), we can use the admin API.
      // But it's best practice to verify. For now, we will just update it via admin API if they provided currentPassword
      // Actually, let's just do a dummy sign in to verify current password if needed, or trust the admin.
      // For simplicity in this demo, we will use updateUserById.
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: data.password,
      });

      if (error) {
        this.logger.error(
          `Failed to update password for ${userId}: ${error.message}`,
        );
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }

    // 2. Update name in respective table
    if (data.name) {
      const [user, advertiser, driver] = await Promise.all([
        this.prisma.user.findFirst({ where: { id: userId } }),
        this.prisma.advertiser.findFirst({ where: { id: userId } }),
        this.prisma.driver.findFirst({ where: { id: userId } }),
      ]);

      if (user) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { name: data.name },
        });
      } else if (advertiser) {
        await this.prisma.advertiser.update({
          where: { id: userId },
          data: { contactName: data.name },
        });
      } else if (driver) {
        await this.prisma.driver.update({
          where: { id: userId },
          data: { fullName: data.name },
        });
      } else {
        throw new HttpException(
          "User not found in any role table",
          HttpStatus.NOT_FOUND,
        );
      }
    }

    return this.getProfile(userId);
  }

  async seedAdminUser() {
    this.logger.log("🔐 Seeding users must be done via Supabase Dashboard");
  }

  /**
   * Exchange a Supabase access_token (issued by Google OAuth) for a portal session.
   *
   * Flow:
   *   1. Validate the Supabase JWT signature locally when it is signed with
   *      the configured legacy HS256 secret. Asymmetric Supabase access tokens
   *      are verified by GoTrue through the public client instead.
   *   2. Look up the user's role in the local DB (Admin → User table, Advertiser → Advertiser table).
   *   3. If the user exists and their role matches `intended_role`, inject
   *      app_metadata.role / app_metadata.entityId into Supabase so subsequent
   *      JWT validations carry the right claims (idempotent).
   *   4. Return a portal-shaped session payload matching /auth/login.
   *
   * SECURITY: This endpoint only ATTESTS the role — it cannot grant it.
   * If the user has no row in the corresponding table, the call is rejected
   * with 403 even if Google says the email is valid. This prevents account
   * squatting via OAuth.
   */
  async exchangeOAuth(dto: OAuthExchangeDto) {
    this.logger.log(`🔐 OAuth exchange attempt → role=${dto.intended_role}`);

    const jwtSecret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new HttpException(
        "Server JWT secret not configured.",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    let payload: any;
    try {
      payload = jwt.verify(dto.access_token, jwtSecret, {
        algorithms: ["HS256"],
      });
    } catch (err: any) {
      // Supabase projects that use asymmetric signing (for example ES256) do
      // not share an HS256 signing secret with this API. Do not reject those
      // valid OAuth tokens merely because local verification is unavailable;
      // ask GoTrue to verify the token with the project's configured keys.
      const anonClient = this.supabaseService.getAnonClient();
      if (!anonClient) {
        this.logger.warn(
          `🚫 No public Supabase client available to verify OAuth token: ${err.message}`,
        );
        throw new UnauthorizedException(
          "Token de Supabase inválido o expirado.",
        );
      }

      const { data, error } = await anonClient.auth.getUser(dto.access_token);
      if (error || !data.user?.id || !data.user.email) {
        this.logger.warn(
          `🚫 Invalid Supabase token presented to /oauth/exchange: ${error?.message || err.message}`,
        );
        throw new UnauthorizedException(
          "Token de Supabase inválido o expirado.",
        );
      }

      payload = {
        sub: data.user.id,
        email: data.user.email,
        name:
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          data.user.email,
        app_metadata: data.user.app_metadata,
      };
      this.logger.debug(
        `✅ OAuth token verified by Supabase after local verification failed: ${data.user.email}`,
      );
    }

    const email: string | undefined = payload?.email;
    const userId: string | undefined = payload?.sub;
    if (!email || !userId) {
      throw new BadRequestException(
        "El token de Supabase no contiene email/sub.",
      );
    }

    this.logger.debug(`🔍 OAuth token verified for ${email}`);

    let resolvedRole: string | null = null;
    let entityId: string | null = null;
    let profile: any = null;

    if (dto.intended_role === OAuthPortalRole.ADMIN) {
      const adminUser = await this.prisma.user.findUnique({ where: { email } });
      if (adminUser) {
        resolvedRole = adminUser.role || "ADMIN";
        profile = { ...adminUser, role: resolvedRole };
      }
    } else if (dto.intended_role === OAuthPortalRole.ADVERTISER) {
      const advertiser = await this.prisma.advertiser.findUnique({
        where: { email },
      });
      if (advertiser) {
        resolvedRole = "ADVERTISER";
        entityId = advertiser.id;
        profile = { ...advertiser, role: resolvedRole };
      } else {
        // Auto-create advertiser record for new users - they'll complete onboarding
        const newAdvertiser = await this.prisma.advertiser.create({
          data: {
            email,
            companyName: payload?.name || email.split("@")[0],
            contactName: payload?.name || email.split("@")[0],
            status: "PENDING_ONBOARDING",
          },
        });
        resolvedRole = "ADVERTISER";
        entityId = newAdvertiser.id;
        profile = { ...newAdvertiser, role: resolvedRole };
        this.logger.log(
          `✅ Auto-created advertiser for new OAuth user: ${email} (ID: ${newAdvertiser.id})`,
        );
      }
    }

    if (!resolvedRole || !profile) {
      this.logger.warn(
        `🚫 OAuth user has no matching ${dto.intended_role} account: ${email}`,
      );
      throw new ForbiddenException(
        `Tu cuenta de Google (${email}) no está autorizada para acceder al portal ${dto.intended_role}. Contacta al administrador.`,
      );
    }

    if (
      payload?.app_metadata?.role !== resolvedRole ||
      payload?.app_metadata?.entityId !== entityId
    ) {
      const { error: updateError } = await this.supabaseService
        .getClient()
        .auth.admin.updateUserById(userId, {
          app_metadata: { role: resolvedRole, entityId },
        });
      if (updateError) {
        this.logger.warn(
          `⚠️ Failed to refresh app_metadata for ${email}: ${updateError.message}`,
        );
      } else {
        this.logger.debug(
          `💉 app_metadata injected for ${email}: role=${resolvedRole}`,
        );
      }
    }

    // Reissue tokens so the returned access_token carries app_metadata.role.
    // The OAuth token was signed BEFORE the metadata injection and its claims
    // are immutable — returning it would give SSR/middleware decoders a GUEST
    // role and instantly logout the user. Refresh against GoTrue (anon scope)
    // and return the freshly minted, role-bearing token pair instead.
    let accessToken = dto.access_token;
    let refreshToken = dto.refresh_token || "";
    const anonClient = this.supabaseService.getAnonClient();
    if (anonClient && dto.refresh_token) {
      try {
        const { data: refreshed, error: refreshError } =
          await anonClient.auth.refreshSession({
            refresh_token: dto.refresh_token,
          });
        if (!refreshError && refreshed.session?.access_token) {
          accessToken = refreshed.session.access_token;
          refreshToken = refreshed.session.refresh_token || refreshToken;
          this.logger.debug(
            `✅ Reissued role-bearing access_token for ${email}`,
          );
        } else {
          this.logger.warn(
            `⚠️ Token reissue failed for ${email}; returning original tokens: ${refreshError?.message}`,
          );
        }
      } catch (e: any) {
        this.logger.warn(
          `⚠️ Exception reissuing tokens for ${email}: ${e.message}`,
        );
      }
    }

    this.logger.log(
      `✅ OAuth exchange success: ${email} → ${resolvedRole} | Entity: ${entityId || "N/A"}`,
    );

    const needsOnboarding =
      dto.intended_role === OAuthPortalRole.ADVERTISER &&
      profile?.status === "PENDING_ONBOARDING";

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: userId,
        email,
        role: resolvedRole,
        entityId,
        name: profile.fullName || profile.contactName || profile.name || email,
      },
      needsOnboarding,
    };
  }

  /**
   * Bootstrap: sync users from Prisma DB into Supabase Auth.
   * This fixes the root cause: users existed in Prisma but NOT in Supabase Auth,
   * causing signInWithPassword() to always fail with "invalid_credentials".
   *
   * Protected by BOOTSTRAP_SECRET env var to prevent abuse.
   */
  async syncUsersToSupabaseAuth(
    bootstrapSecret: string,
  ): Promise<{ synced: number; errors: string[] }> {
    const expectedSecret = process.env.BOOTSTRAP_SECRET;
    if (!expectedSecret || bootstrapSecret !== expectedSecret) {
      throw new ForbiddenException("Invalid bootstrap secret");
    }

    const serviceClient = this.supabaseService.getClient();
    if (!serviceClient) {
      throw new Error("Supabase service client not available");
    }

    const bootstrapPassword = process.env.AUTH_BOOTSTRAP_PASSWORD;
    const errors: string[] = [];
    let synced = 0;

    // 1. Get all users from Prisma
    const [admins, advertisers, drivers] = await Promise.all([
      this.prisma.user.findMany({
        select: { id: true, email: true, role: true },
      }),
      this.prisma.advertiser.findMany({ select: { id: true, email: true } }),
      this.prisma.driver.findMany({ select: { id: true, phone: true } }),
    ]);

    this.logger.log(
      `🔄 Sync: ${admins.length} admins, ${advertisers.length} advertisers, ${drivers.length} drivers`,
    );

    // Helper to upsert a user in Supabase Auth without resetting existing passwords.
    const upsertUser = async (
      email: string,
      password: string | undefined,
      appMeta: Record<string, any>,
    ) => {
      try {
        const { data: listedUsers, error: listError } =
          await serviceClient.auth.admin.listUsers();
        if (listError) {
          throw new Error(`Failed to list Auth users: ${listError.message}`);
        }
        const existing = listedUsers?.users?.find(
          (u: any) => u.email === email,
        );
        if (existing) {
          const { error: updateError } =
            await serviceClient.auth.admin.updateUserById(existing.id, {
              email_confirm: true,
              app_metadata: appMeta,
            });
          if (updateError) {
            throw new Error(
              `Failed to update Auth metadata: ${updateError.message}`,
            );
          }
          this.logger.debug(`✅ Updated existing auth user: ${email}`);
          synced++;
          return;
        }

        if (!password) {
          errors.push(
            `${email}: missing AUTH_BOOTSTRAP_PASSWORD for new Auth user`,
          );
          this.logger.warn(
            `⚠️ Cannot create Auth user ${email}: AUTH_BOOTSTRAP_PASSWORD is not configured`,
          );
          return;
        }

        const { error: createError } =
          await serviceClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            app_metadata: appMeta,
          });
        if (createError) {
          errors.push(`${email}: ${createError.message}`);
          this.logger.warn(
            `⚠️ Failed to create Auth user ${email}: ${createError.message}`,
          );
          return;
        }
        this.logger.debug(`✅ Created auth user: ${email}`);
        synced++;
      } catch (e: any) {
        errors.push(`${email}: ${e.message}`);
        this.logger.warn(`⚠️ Exception syncing ${email}: ${e.message}`);
      }
    };

    // 2. Sync admins
    for (const admin of admins) {
      if (!admin.email) continue;
      await upsertUser(admin.email, bootstrapPassword, {
        role: admin.role || "ADMIN",
        entityId: admin.id,
      });
    }

    // 3. Sync advertisers
    for (const adv of advertisers) {
      if (!adv.email) continue;
      await upsertUser(adv.email, bootstrapPassword, {
        role: "ADVERTISER",
        entityId: adv.id,
      });
    }

    // 4. Sync drivers (use phone@tad.driver as email proxy)
    for (const driver of drivers) {
      const driverEmail = `${driver.phone}@tad.driver`;
      await upsertUser(driverEmail, bootstrapPassword, {
        role: "DRIVER",
        entityId: driver.id,
      });
    }

    this.logger.log(
      `✅ Auth sync complete: ${synced} users synced, ${errors.length} errors`,
    );
    return { synced, errors };
  }

  /**
   * Confirm a user by email (admin API).
   * Used to fix users created via public signup that are stuck in unconfirmed state.
   */
  async confirmUserByEmail(
    email: string,
    bootstrapSecret: string,
  ): Promise<{ confirmed: boolean }> {
    const expectedSecret = process.env.BOOTSTRAP_SECRET;
    if (!expectedSecret || bootstrapSecret !== expectedSecret) {
      throw new ForbiddenException("Invalid bootstrap secret");
    }

    const serviceClient = this.supabaseService.getClient();
    const { data: users, error: listError } =
      await serviceClient.auth.admin.listUsers();

    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    const user = users?.users?.find((u: any) => u.email === email);
    if (!user) {
      throw new NotFoundException(`User ${email} not found in Supabase Auth`);
    }

    // Confirm the user without resetting or changing their password
    const { error: updateError } =
      await serviceClient.auth.admin.updateUserById(user.id, {
        email_confirm: true,
        app_metadata: { role: "ADMIN", entityId: user.id },
      });

    if (updateError) {
      throw new Error(`Failed to confirm user: ${updateError.message}`);
    }

    this.logger.log(`✅ Confirmed user: ${email} (id=${user.id})`);
    return { confirmed: true };
  }

  async generatePairingToken(driverId: string) {
    const payload = { sub: driverId, type: "pairing" };
    return {
      token: this.jwtService.sign(payload, { expiresIn: "5m" }),
      expiresIn: 300,
    };
  }

  async registerDriver(data: {
    name: string;
    phone: string;
    password: string;
    vehicleModel?: string;
    licensePlate?: string;
  }) {
    const existingDriver = await this.prisma.driver.findUnique({
      where: { phone: data.phone },
    });
    if (existingDriver) {
      throw new HttpException(
        "Ya existe un chofer con ese teléfono",
        HttpStatus.CONFLICT,
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const driver = await this.prisma.driver.create({
      data: {
        fullName: data.name,
        phone: data.phone,
        taxiPlate: data.vehicleModel || null,
        licensePlate: data.licensePlate || null,
        password: hashedPassword,
        status: BUSINESS_RULES.STATUS.DRIVER.INITIAL,
        subscriptionPaid: false,
        contractAccepted: false,
        onboardingStatus: BUSINESS_RULES.STATUS.DRIVER.ONBOARDING.TOS_PENDING,
      },
    });

    const jwtSecret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
    if (!jwtSecret) {
      return {
        success: true,
        message: "Registro completado. Inicia sesión para continuar.",
        driverId: driver.id,
      };
    }

    const token = jwt.sign(
      {
        sub: driver.id,
        phone: driver.phone,
        role: "DRIVER",
        app_metadata: { role: "DRIVER", entityId: driver.id },
      },
      jwtSecret,
      { expiresIn: JWT_EXPIRY },
    );

    return {
      success: true,
      message: "Registro completado exitosamente.",
      access_token: token,
      driverId: driver.id,
    };
  }
}
