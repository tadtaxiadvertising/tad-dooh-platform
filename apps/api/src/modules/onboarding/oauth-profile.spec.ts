import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CompleteOAuthAdvertiserProfileDto } from "./dto/complete-oauth-advertiser-profile.dto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { IS_PUBLIC_KEY } from "../auth/decorators/public.decorator";
import { ROLES_KEY, UserRole } from "../auth/decorators/roles.decorator";
import { OnboardingService } from "./onboarding.service";
import { OnboardingController } from "./onboarding.controller";

describe("Verified OAuth advertiser profile completion (no account creation)", () => {
  const findUnique = jest.fn();
  const updateMany = jest.fn();
  const prisma = { advertiser: { findUnique, updateMany } };
  const createAuthUser = jest.fn();
  const supabase = {
    getClient: jest.fn(() => ({
      auth: { admin: { createUser: createAuthUser } },
    })),
  };
  const service = new OnboardingService(prisma as never, supabase as never);
  const controller = new OnboardingController(service);
  const identity = {
    role: "ADVERTISER",
    entityId: "advertiser-1",
    email: "owner@example.test",
  };
  const form = {
    companyName: "  Compañía Ejemplo  ",
    contactName: "  María Pérez  ",
    phone: "+1 809 555 0100",
  };

  beforeEach(() => {
    jest.resetAllMocks();
    findUnique.mockResolvedValue({
      id: "advertiser-1",
      email: "owner@example.test",
      status: "PENDING_ONBOARDING",
    });
    updateMany.mockResolvedValue({ count: 1 });
  });

  it("requires authentication and ADVERTISER RBAC; it is never Public", async () => {
    const handler = OnboardingController.prototype.completeOAuthProfile;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).not.toBe(true);
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([
      UserRole.ADVERTISER,
    ]);
    await expect(
      controller.completeOAuthProfile({ user: identity }, form),
    ).resolves.toEqual({
      advertiserId: "advertiser-1",
      status: "PENDING_REVIEW",
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "advertiser-1" },
      select: { id: true, email: true, status: true },
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "advertiser-1", status: "PENDING_ONBOARDING" },
      data: {
        companyName: "Compañía Ejemplo",
        contactName: "María Pérez",
        phone: "+1 809 555 0100",
        status: "PENDING_REVIEW",
      },
    });
    expect(createAuthUser).not.toHaveBeenCalled();
  });

  it("rejects malformed DTOs before any profile mutation", async () => {
    const valid = plainToInstance(CompleteOAuthAdvertiserProfileDto, {
      companyName: "Empresa",
      contactName: "Contacto",
      phone: "+1 809 555 0100",
    });
    expect(await validate(valid)).toEqual([]);
    for (const invalid of [
      { companyName: "", contactName: "Persona" },
      { companyName: "Empresa", contactName: "" },
      { companyName: "Empresa", contactName: "Persona", phone: "<script>" },
      { companyName: "X".repeat(121), contactName: "Persona" },
    ]) {
      expect(
        (
          await validate(
            plainToInstance(CompleteOAuthAdvertiserProfileDto, invalid),
          )
        ).length,
      ).toBeGreaterThan(0);
    }
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("never honors caller-provided approval, advertiser ID or financial fields", async () => {
    const hostile = {
      ...form,
      advertiserId: "other-advertiser",
      status: "ACTIVE",
      role: "ADMIN",
      budget: 0,
      referredBy: "driver-fixture",
    };
    await expect(
      service.completeOAuthAdvertiserProfile(identity, hostile),
    ).resolves.toMatchObject({ status: "PENDING_REVIEW" });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "advertiser-1", status: "PENDING_ONBOARDING" },
      data: {
        companyName: "Compañía Ejemplo",
        contactName: "María Pérez",
        phone: "+1 809 555 0100",
        status: "PENDING_REVIEW",
      },
    });
    expect(createAuthUser).not.toHaveBeenCalled();
  });

  it("is idempotent: a submitted profile is not overwritten by retries", async () => {
    findUnique.mockResolvedValue({
      id: "advertiser-1",
      email: "owner@example.test",
      status: "PENDING_REVIEW",
    });
    await expect(
      service.completeOAuthAdvertiserProfile(identity, form),
    ).resolves.toEqual({
      advertiserId: "advertiser-1",
      status: "PENDING_REVIEW",
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("resolves a concurrent duplicate request without a second update", async () => {
    findUnique
      .mockResolvedValueOnce({
        id: "advertiser-1",
        email: "owner@example.test",
        status: "PENDING_ONBOARDING",
      })
      .mockResolvedValueOnce({ status: "PENDING_REVIEW" });
    updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.completeOAuthAdvertiserProfile(identity, form),
    ).resolves.toMatchObject({ status: "PENDING_REVIEW" });
    expect(updateMany).toHaveBeenCalledTimes(1);
  });

  it("fails closed when approval/status changed concurrently", async () => {
    findUnique
      .mockResolvedValueOnce({
        id: "advertiser-1",
        email: "owner@example.test",
        status: "PENDING_ONBOARDING",
      })
      .mockResolvedValueOnce({ status: "SUSPENDED" });
    updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.completeOAuthAdvertiserProfile(identity, form),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it.each(["ACTIVE", "SUSPENDED", "DISABLED"])(
    "cannot rewrite an already %s account",
    async (status) => {
      findUnique.mockResolvedValue({
        id: "advertiser-1",
        email: "owner@example.test",
        status,
      });
      await expect(
        service.completeOAuthAdvertiserProfile(identity, form),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(updateMany).not.toHaveBeenCalled();
    },
  );

  it("rejects missing, different-email or different-entity identities", async () => {
    for (const invalid of [
      { ...identity, role: "DRIVER" },
      { ...identity, entityId: "" },
      { ...identity, email: "" },
    ]) {
      await expect(
        service.completeOAuthAdvertiserProfile(invalid, form),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }
    findUnique.mockResolvedValueOnce(null);
    await expect(
      service.completeOAuthAdvertiserProfile(identity, form),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    findUnique.mockResolvedValueOnce({
      id: "advertiser-1",
      email: "other@example.test",
      status: "PENDING_ONBOARDING",
    });
    await expect(
      service.completeOAuthAdvertiserProfile(identity, form),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("does not accept invalid business data or a status payload", async () => {
    for (const invalid of [
      { ...form, companyName: " " },
      { ...form, contactName: "" },
      { ...form, phone: "unsafe<script>" },
    ]) {
      await expect(
        service.completeOAuthAdvertiserProfile(identity, invalid),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(updateMany).not.toHaveBeenCalled();
  });
});
