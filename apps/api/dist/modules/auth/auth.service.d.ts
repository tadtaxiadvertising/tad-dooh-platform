import { SupabaseService } from '../supabase/supabase.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private readonly supabaseService;
    private readonly prisma;
    private readonly jwtService;
    private readonly logger;
    constructor(supabaseService: SupabaseService, prisma: PrismaService, jwtService: JwtService);
    login(dto: LoginDto): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            email: string;
            role: string;
            entityId: string;
        };
    }>;
    getProfile(userId: string): Promise<{
        role: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        password: string;
        email: string;
    } | {
        role: string;
        category: string | null;
        whatsapp: string | null;
        instagram: string | null;
        facebook: string | null;
        websiteUrl: string | null;
        pedidosYaUrl: string | null;
        uberEatsUrl: string | null;
        id: string;
        createdAt: Date;
        status: string;
        updatedAt: Date;
        phone: string | null;
        referredBy: string | null;
        password: string | null;
        companyName: string;
        contactName: string;
        email: string;
        productsData: string | null;
    } | {
        role: string;
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.SystemStatus;
        updatedAt: Date;
        taxiNumber: string | null;
        isSimulated: boolean;
        fullName: string;
        cedula: string | null;
        phone: string;
        licensePlate: string | null;
        taxiPlate: string | null;
        subscriptionPaid: boolean;
        subscriptionEnd: Date | null;
        onboardingStatus: string;
        onboardedAt: Date;
        blockedAt: Date | null;
        referredBy: string | null;
        password: string | null;
        level: string;
        consecutiveMonthsUnderGoal: number;
        identidadVehicular: import("@prisma/client/runtime/library").JsonValue | null;
        hardwareConfig: import("@prisma/client/runtime/library").JsonValue | null;
        insuranceAccepted: boolean;
        insuranceAcceptedAt: Date | null;
        contractAccepted: boolean;
        contractAcceptedAt: Date | null;
        agreementVersion: string | null;
        walletBalance: number;
        referralCode: string | null;
        bankAccount: import("@prisma/client/runtime/library").JsonValue | null;
    } | {
        id: string;
        role: string;
    }>;
    updateProfile(userId: string, data: {
        name?: string;
        password?: string;
        currentPassword?: string;
    }): Promise<{
        role: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        password: string;
        email: string;
    } | {
        role: string;
        category: string | null;
        whatsapp: string | null;
        instagram: string | null;
        facebook: string | null;
        websiteUrl: string | null;
        pedidosYaUrl: string | null;
        uberEatsUrl: string | null;
        id: string;
        createdAt: Date;
        status: string;
        updatedAt: Date;
        phone: string | null;
        referredBy: string | null;
        password: string | null;
        companyName: string;
        contactName: string;
        email: string;
        productsData: string | null;
    } | {
        role: string;
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.SystemStatus;
        updatedAt: Date;
        taxiNumber: string | null;
        isSimulated: boolean;
        fullName: string;
        cedula: string | null;
        phone: string;
        licensePlate: string | null;
        taxiPlate: string | null;
        subscriptionPaid: boolean;
        subscriptionEnd: Date | null;
        onboardingStatus: string;
        onboardedAt: Date;
        blockedAt: Date | null;
        referredBy: string | null;
        password: string | null;
        level: string;
        consecutiveMonthsUnderGoal: number;
        identidadVehicular: import("@prisma/client/runtime/library").JsonValue | null;
        hardwareConfig: import("@prisma/client/runtime/library").JsonValue | null;
        insuranceAccepted: boolean;
        insuranceAcceptedAt: Date | null;
        contractAccepted: boolean;
        contractAcceptedAt: Date | null;
        agreementVersion: string | null;
        walletBalance: number;
        referralCode: string | null;
        bankAccount: import("@prisma/client/runtime/library").JsonValue | null;
    } | {
        id: string;
        role: string;
    }>;
    seedAdminUser(): Promise<void>;
    generatePairingToken(driverId: string): Promise<{
        token: string;
        expiresIn: number;
    }>;
    registerDriver(data: {
        name: string;
        phone: string;
        password: string;
        vehicleModel?: string;
        licensePlate?: string;
    }): Promise<{
        success: boolean;
        message: string;
        driverId: string;
        access_token?: undefined;
    } | {
        success: boolean;
        message: string;
        access_token: string;
        driverId: string;
    }>;
}
