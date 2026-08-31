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
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
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
        companyName: string;
        contactName: string;
        email: string;
        phone: string | null;
        productsData: string | null;
        referredBy: string | null;
        password: string | null;
    } | {
        role: string;
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.SystemStatus;
        updatedAt: Date;
        taxiNumber: string | null;
        isSimulated: boolean;
        phone: string;
        referredBy: string | null;
        password: string | null;
        fullName: string;
        cedula: string | null;
        licensePlate: string | null;
        taxiPlate: string | null;
        subscriptionPaid: boolean;
        subscriptionEnd: Date | null;
        onboardingStatus: string;
        onboardedAt: Date;
        blockedAt: Date | null;
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
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
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
        companyName: string;
        contactName: string;
        email: string;
        phone: string | null;
        productsData: string | null;
        referredBy: string | null;
        password: string | null;
    } | {
        role: string;
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.SystemStatus;
        updatedAt: Date;
        taxiNumber: string | null;
        isSimulated: boolean;
        phone: string;
        referredBy: string | null;
        password: string | null;
        fullName: string;
        cedula: string | null;
        licensePlate: string | null;
        taxiPlate: string | null;
        subscriptionPaid: boolean;
        subscriptionEnd: Date | null;
        onboardingStatus: string;
        onboardedAt: Date;
        blockedAt: Date | null;
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
