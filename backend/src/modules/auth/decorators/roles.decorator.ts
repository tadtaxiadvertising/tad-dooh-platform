import { SetMetadata } from '@nestjs/common';

export enum UserRole {
  ADMIN = 'ADMIN',
  ADVERTISER = 'ADVERTISER',
  DRIVER = 'DRIVER',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
