export declare enum UserRole {
    ADMIN = "ADMIN",
    ADVERTISER = "ADVERTISER",
    DRIVER = "DRIVER"
}
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: UserRole[]) => import("@nestjs/common").CustomDecorator<string>;
