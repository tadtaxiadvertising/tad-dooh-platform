import {
  CallHandler,
  ConflictException,
  ExecutionContext,
} from "@nestjs/common";
import { firstValueFrom, of, throwError } from "rxjs";
import { PrismaService } from "../../modules/prisma/prisma.service";
import { IdempotencyInterceptor } from "./idempotency.interceptor";

function makeContext(body: Record<string, unknown> = { amount: 125 }) {
  const request = {
    method: "POST",
    path: "/api/v1/wallet/withdraw",
    headers: { "idempotency-key": "stable-random-request-id" },
    user: { id: "auth-user-123" },
    body,
    query: {},
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

function makePrisma() {
  return {
    idempotencyKey: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

describe("IdempotencyInterceptor — financial and offline retry safety", () => {
  it("awaits result persistence before sending a successful HTTP response", async () => {
    const prisma = makePrisma();
    let completeUpdate: (() => void) | undefined;
    prisma.idempotencyKey.update.mockReturnValue(
      new Promise<void>((resolve) => {
        completeUpdate = resolve;
      }),
    );
    const interceptor = new IdempotencyInterceptor(
      prisma as unknown as PrismaService,
    );
    const next = { handle: jest.fn(() => of({ transactionId: "t-1" })) };
    const { context } = makeContext();

    const response$ = await interceptor.intercept(context, next as CallHandler);
    let wasDelivered = false;
    const responsePromise = firstValueFrom(response$).then((value) => {
      wasDelivered = true;
      return value;
    });
    await Promise.resolve();

    expect(prisma.idempotencyKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          response: JSON.stringify({ transactionId: "t-1" }),
          isLocked: false,
        },
      }),
    );
    expect(wasDelivered).toBe(false);
    expect(completeUpdate).toBeDefined();

    completeUpdate?.();
    await expect(responsePromise).resolves.toEqual({ transactionId: "t-1" });
    expect(wasDelivered).toBe(true);
  });

  it("replays a completed matching response without re-executing the handler", async () => {
    const prisma = makePrisma();
    const interceptor = new IdempotencyInterceptor(
      prisma as unknown as PrismaService,
    );
    const { context } = makeContext();
    const next = { handle: jest.fn(() => of({ status: "APPROVED" })) };

    await firstValueFrom(
      await interceptor.intercept(context, next as CallHandler),
    );
    const saved = prisma.idempotencyKey.create.mock.calls[0][0].data;
    prisma.idempotencyKey.findUnique.mockResolvedValue({
      ...saved,
      response: JSON.stringify({ status: "APPROVED" }),
      isLocked: false,
    });

    await expect(
      firstValueFrom(await interceptor.intercept(context, next as CallHandler)),
    ).resolves.toEqual({ status: "APPROVED" });
    expect(next.handle).toHaveBeenCalledTimes(1);
    expect(prisma.idempotencyKey.create).toHaveBeenCalledTimes(1);
  });

  it("rejects a reused key with a different financial payload", async () => {
    const prisma = makePrisma();
    const interceptor = new IdempotencyInterceptor(
      prisma as unknown as PrismaService,
    );
    const next = { handle: jest.fn(() => of({ success: true })) };
    const { context } = makeContext({ amount: 125 });

    await firstValueFrom(
      await interceptor.intercept(context, next as CallHandler),
    );
    prisma.idempotencyKey.findUnique.mockResolvedValue({
      ...prisma.idempotencyKey.create.mock.calls[0][0].data,
      response: JSON.stringify({ success: true }),
      isLocked: false,
    });

    await expect(
      interceptor.intercept(
        makeContext({ amount: 999 }).context,
        next as CallHandler,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(next.handle).toHaveBeenCalledTimes(1);
  });

  it("does not unlock or delete an expired in-flight operation", async () => {
    const prisma = makePrisma();
    const interceptor = new IdempotencyInterceptor(
      prisma as unknown as PrismaService,
    );
    const { context } = makeContext();
    const next = { handle: jest.fn(() => of({ confirmation: "pending" })) };

    await firstValueFrom(
      await interceptor.intercept(context, next as CallHandler),
    );
    prisma.idempotencyKey.findUnique.mockResolvedValue({
      ...prisma.idempotencyKey.create.mock.calls[0][0].data,
      isLocked: true,
      response: null,
      expiresAt: new Date(0),
    });

    await expect(
      interceptor.intercept(context, next as CallHandler),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.idempotencyKey.deleteMany).not.toHaveBeenCalled();
    expect(next.handle).toHaveBeenCalledTimes(1);
  });

  it("isolates idempotency keys between different authenticated users", async () => {
    const prisma = makePrisma();
    const interceptor = new IdempotencyInterceptor(
      prisma as unknown as PrismaService,
    );
    const first = makeContext();
    const second = makeContext();
    second.request.user.id = "another-auth-user";
    const next = { handle: jest.fn(() => of({ success: true })) };

    await firstValueFrom(
      await interceptor.intercept(first.context, next as CallHandler),
    );
    await firstValueFrom(
      await interceptor.intercept(second.context, next as CallHandler),
    );

    const [firstKey, secondKey] = prisma.idempotencyKey.create.mock.calls.map(
      ([operation]) => operation.data.key,
    );
    expect(firstKey).not.toBe(secondKey);
    expect(next.handle).toHaveBeenCalledTimes(2);
  });

  it("fails closed when a concurrent insert hits the unique-key constraint", async () => {
    const prisma = makePrisma();
    prisma.idempotencyKey.create.mockRejectedValue({ code: "P2002" });
    const interceptor = new IdempotencyInterceptor(
      prisma as unknown as PrismaService,
    );
    const next = { handle: jest.fn(() => of({})) };
    await expect(
      interceptor.intercept(makeContext().context, next as CallHandler),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(next.handle).not.toHaveBeenCalled();
  });

  it("keeps the lock for reconciliation if a handler fails after an unknown side effect", async () => {
    const prisma = makePrisma();
    const interceptor = new IdempotencyInterceptor(
      prisma as unknown as PrismaService,
    );
    const operationError = new Error("downstream uncertain outcome");
    const next = {
      handle: jest.fn(() => throwError(() => operationError)),
    };
    const result = await interceptor.intercept(
      makeContext().context,
      next as CallHandler,
    );

    await expect(firstValueFrom(result)).rejects.toBe(operationError);
    expect(prisma.idempotencyKey.update).not.toHaveBeenCalled();
    expect(prisma.idempotencyKey.deleteMany).not.toHaveBeenCalled();
  });

  it("keeps an unknown outcome locked when saving a committed result fails", async () => {
    const prisma = makePrisma();
    prisma.idempotencyKey.update.mockRejectedValue(
      new Error("database write unavailable"),
    );
    const interceptor = new IdempotencyInterceptor(
      prisma as unknown as PrismaService,
    );
    const next = { handle: jest.fn(() => of({ withdrawalId: "w-1" })) };

    const response$ = await interceptor.intercept(
      makeContext().context,
      next as CallHandler,
    );

    await expect(firstValueFrom(response$)).rejects.toThrow(
      "database write unavailable",
    );
    expect(prisma.idempotencyKey.deleteMany).not.toHaveBeenCalled();
    expect(prisma.idempotencyKey.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isLocked: true }),
      }),
    );
  });

  it("replays completed withdrawals after the 24h review horizon without a second charge", async () => {
    const prisma = makePrisma();
    const interceptor = new IdempotencyInterceptor(
      prisma as unknown as PrismaService,
    );
    const { context } = makeContext();
    const next = { handle: jest.fn(() => of({ withdrawalId: "w-123" })) };

    await expect(
      firstValueFrom(await interceptor.intercept(context, next as CallHandler)),
    ).resolves.toEqual({ withdrawalId: "w-123" });

    prisma.idempotencyKey.findUnique.mockResolvedValue({
      ...prisma.idempotencyKey.create.mock.calls[0][0].data,
      isLocked: false,
      response: JSON.stringify({ withdrawalId: "w-123" }),
      expiresAt: new Date(0),
    });

    await expect(
      firstValueFrom(await interceptor.intercept(context, next as CallHandler)),
    ).resolves.toEqual({ withdrawalId: "w-123" });
    expect(prisma.idempotencyKey.deleteMany).not.toHaveBeenCalled();
    expect(prisma.idempotencyKey.create).toHaveBeenCalledTimes(1);
    expect(next.handle).toHaveBeenCalledTimes(1);
  });

  it("fails closed on an expired record with no verifiable response", async () => {
    const prisma = makePrisma();
    const interceptor = new IdempotencyInterceptor(
      prisma as unknown as PrismaService,
    );
    const { context } = makeContext();
    const next = { handle: jest.fn(() => of({ withdrawalId: "w-456" })) };

    await firstValueFrom(
      await interceptor.intercept(context, next as CallHandler),
    );
    prisma.idempotencyKey.findUnique.mockResolvedValue({
      ...prisma.idempotencyKey.create.mock.calls[0][0].data,
      isLocked: false,
      response: null,
      expiresAt: new Date(0),
    });

    await expect(
      interceptor.intercept(context, next as CallHandler),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.idempotencyKey.create).toHaveBeenCalledTimes(1);
    expect(prisma.idempotencyKey.deleteMany).not.toHaveBeenCalled();
    expect(next.handle).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed key headers without writing to the database", async () => {
    const prisma = makePrisma();
    const interceptor = new IdempotencyInterceptor(
      prisma as unknown as PrismaService,
    );
    const { context, request } = makeContext();
    request.headers["idempotency-key"] = "   ";
    const next = { handle: jest.fn(() => of({})) };

    await expect(
      interceptor.intercept(context, next as CallHandler),
    ).rejects.toBeDefined();
    expect(prisma.idempotencyKey.findUnique).not.toHaveBeenCalled();
  });
});
