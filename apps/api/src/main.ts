import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { PrismaService } from "./modules/prisma/prisma.service";
import { Logger, RequestMethod, ValidationPipe } from "@nestjs/common";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { PrismaClientExceptionFilter } from "./common/filters/prisma-exception.filter";

// Safe BigInt serialization for Prisma
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

// Only override toJSON if not already defined (prevents duplicate definitions)
if (!BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function () {
    return this.toString();
  };
}

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  try {
    // JWT_SECRET: crash-early si falta. Usa requireEnv() que lanza Error si no está configurado.
    // En desarrollo, se puede definir SUPABASE_JWT_SECRET como alias.
    const jwtSecret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error(
        "❌ JWT_SECRET/SUPABASE_JWT_SECRET no configurados — Abortando arranque. Configúrelos en EasyPanel Secrets.",
      );
      process.exit(1);
    }
    // Normalizar: JWT_SECRET siempre definido para librerías que lo lean directo
    process.env.JWT_SECRET = jwtSecret;
    logger.log("✅ JWT_SECRET validado correctamente");

    // Forzamos el buffer de logs para capturar errores prematuros de inyección
    const app = await NestFactory.create(AppModule, {
      bufferLogs: true,
      logger: ["error", "warn", "log", "debug"],
    });

    // Prevención de fugas de conexiones (Auditoría 07)
    app.get(PrismaService);
    app.enableShutdownHooks();

    app.setGlobalPrefix("api/v1", {
      exclude: [
        { path: "/", method: RequestMethod.GET },
        { path: "api", method: RequestMethod.GET },
        { path: "api/health", method: RequestMethod.GET },
        { path: "api/v1", method: RequestMethod.GET },
        { path: "health", method: RequestMethod.GET },
        // Explicit exclusions: "health" does not match GET /health/full.
        // Do not expose /health/db to unauthenticated root probes; it includes
        // operational connection counts and remains under /api/v1.
        { path: "health/full", method: RequestMethod.GET },
        { path: "health/ready", method: RequestMethod.GET },
      ],
    });

    // SHELTER C-I1: CORS restringido a dominios TAD conocidos
    // Valor "true" es una trampa de EasyPanel: split(',') produciría ["true"].
    const rawCorsOrigin =
      process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== "true"
        ? process.env.CORS_ORIGIN
        : "";
    const envOrigins = rawCorsOrigin
      ? rawCorsOrigin.split(",").map((o) => o.trim())
      : [];
    const baseOrigins = [
      // New production domains (ibusiness.com.do)
      "https://tad.adm.ibusiness.com.do",
      "https://tad.anunciante.ibusiness.com.do",
      "https://tad.driver.ibusiness.com.do",
      // Optional alias for the driver portal; DNS and EasyPanel domain mapping must also exist.
      "https://tad.drive.ibusiness.com.do",
      "https://tad.player.ibusiness.com.do",
      // Legacy EasyPanel domains (kept for backward compatibility during transition)
      "https://tad-admin.rewvid.easypanel.host",
      "https://tad-driver.rewvid.easypanel.host",
      "https://tad-driver-flutter.rewvid.easypanel.host",
      "https://tad-advertiser.rewvid.easypanel.host",
      "https://tad-api.rewvid.easypanel.host",
      "https://proyecto-ia-tad-dashboard.rewvid.easypanel.host",
      "https://proyecto-ia-tad-player.rewvid.easypanel.host",
      "https://proyecto-ia-tad-advertiser.rewvid.easypanel.host",
      "https://proyecto-ia-tad-driver.rewvid.easypanel.host",
      "https://proyecto-ia-tad-simulator.rewvid.easypanel.host",
      "https://tad-simulator.rewvid.easypanel.host",
    ];

    const allowedOrigins = [...new Set([...baseOrigins, ...envOrigins])].map(
      (o) => o.replace(/\/$/, ""),
    );
    const allowAllOrigins = allowedOrigins.includes("*");
    if (process.env.NODE_ENV !== "production") {
      allowedOrigins.push(
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3000",
      );
    }

    app.enableCors({
      origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => {
        // Allow requests with no origin (mobile apps / curl)
        if (!origin) {
          callback(null, true);
          return;
        }

        // Strict allow-list for production origins
        const normalizedOrigin = origin.replace(/\/$/, "");
        if (allowAllOrigins || allowedOrigins.includes(normalizedOrigin)) {
          callback(null, true);
          return;
        }

        logger.warn(
          `[CORS] Blocked origin: ${origin}. Configure CORS_ORIGIN to allow it.`,
        );
        callback(new Error(`CORS blocked for origin: ${origin}`), false);
      },
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
      allowedHeaders:
        "Content-Type, Accept, Authorization, X-Requested-With, X-Device-Id, X-Tablet-Id, X-Tablet-Key, X-Admin-Secret, X-Device-Token",
      credentials: true,
      optionsSuccessStatus: 204,
      preflightContinue: false,
    });

    // Prisma filter first: catches PrismaClient* errors (P2002 → 409, etc.);
    // GlobalExceptionFilter catches everything else.
    app.useGlobalFilters(
      new PrismaClientExceptionFilter(),
      new GlobalExceptionFilter(),
    );

    // M20: ValidationPipe global con whitelist para prevenir mass-assignment.
    // whitelist: true descarta campos no declarados en DTOs.
    // forbidNonWhitelisted: false para no romper requests legacy (solo descarta silenciosamente).
    // transform: true convierte payloads a instancias de clase DTO.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        disableErrorMessages: process.env.NODE_ENV === "production",
      }),
    );

    const port = process.env.PORT || 3000;
    await app.listen(port, "0.0.0.0");
    logger.log(`🚀 TAD DOOH API Gateway Operativo en el puerto ${port}`);
  } catch (error) {
    // Esto atrapará el fallo fantasma de Prisma o Supabase durante el arranque
    logger.error(
      "❌ CRASH FATAL DE ARRANQUE:",
      error instanceof Error ? error.stack : JSON.stringify(error),
    );
    process.exit(1);
  }
}
bootstrap();
