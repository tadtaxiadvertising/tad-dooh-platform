import type { Request } from "express";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  entityId?: string;
  sub?: string;
}

export type AuthenticatedRequest = Request & {
  user: AuthUser;
  authenticatedDeviceId?: string;
};
