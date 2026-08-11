import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    getProfile(req: any): Promise<{
        role: string;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        password: string;
        email: string;
    } | {
        role: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        referredBy: string | null;
        password: string | null;
        facebook: string | null;
        instagram: string | null;
        pedidosYaUrl: string | null;
        uberEatsUrl: string | null;
        websiteUrl: string | null;
        whatsapp: string | null;
        category: string | null;
        companyName: string;
        contactName: string;
        email: string;
        productsData: string | null;
    } | {
        role: string;
        id: string;
        taxiNumber: string | null;
        status: import(".prisma/client").$Enums.SystemStatus;
        createdAt: Date;
        updatedAt: Date;
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
    updateProfile(req: any, dto: {
        name?: string;
        password?: string;
        currentPassword?: string;
    }): Promise<{
        role: string;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        password: string;
        email: string;
    } | {
        role: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        referredBy: string | null;
        password: string | null;
        facebook: string | null;
        instagram: string | null;
        pedidosYaUrl: string | null;
        uberEatsUrl: string | null;
        websiteUrl: string | null;
        whatsapp: string | null;
        category: string | null;
        companyName: string;
        contactName: string;
        email: string;
        productsData: string | null;
    } | {
        role: string;
        id: string;
        taxiNumber: string | null;
        status: import(".prisma/client").$Enums.SystemStatus;
        createdAt: Date;
        updatedAt: Date;
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
    generatePairingToken(req: any): Promise<{
        token: string;
        expiresIn: number;
    }>;
    registerDriver(dto: {
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
