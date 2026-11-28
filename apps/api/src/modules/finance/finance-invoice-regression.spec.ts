import { advertiserSafeSelect } from "../advertisers/advertiser-safe-select";
import {
  BadRequestException,
  UnauthorizedException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  BUSINESS_RULES,
  BCRYPT_ROUNDS,
} from "../../common/constants/business-rules";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vm from "node:vm";
import * as ts from "typescript";

// Execute the actual method body with isolated collaborators: no Prisma client,
// transport, environment file, or application bootstrap is loaded.
function loadMethod(
  file: string,
  className: string,
  methodName: string,
  globals: Record<string, unknown> = {},
) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const declaration = source.statements.find(
    (node): node is ts.ClassDeclaration =>
      ts.isClassDeclaration(node) && node.name?.text === className,
  );
  const method = declaration?.members.find(
    (member): member is ts.MethodDeclaration =>
      ts.isMethodDeclaration(member) &&
      member.name.getText(source) === methodName,
  );
  if (!method?.body) throw new Error("Regression target method not found");
  const parameters = method.parameters.map((parameter) =>
    ts.factory.updateParameterDeclaration(
      parameter,
      undefined,
      parameter.dotDotDotToken,
      parameter.name,
      parameter.questionToken,
      parameter.type,
      parameter.initializer,
    ),
  );
  const fn = ts.factory.createFunctionDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword)],
    undefined,
    "target",
    undefined,
    parameters,
    method.type,
    method.body,
  );
  const printer = ts.createPrinter();
  const constants = source.statements.filter(
    (statement) =>
      ts.isVariableStatement(statement) &&
      statement.declarationList.declarations.some(
        (declaration) =>
          declaration.name.getText(source) === "mediaAssetSafeSelect",
      ),
  );
  const printed =
    constants
      .map((statement) =>
        printer.printNode(ts.EmitHint.Unspecified, statement, source),
      )
      .join("\n") +
    "\n" +
    printer.printNode(ts.EmitHint.Unspecified, fn, source);
  const compiled = ts.transpileModule(printed, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2021,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
  return vm.runInNewContext(compiled + "\ntarget", {
    Buffer,
    BUSINESS_RULES,
    BCRYPT_ROUNDS,
    advertiserSafeSelect,
    BadRequestException,
    UnauthorizedException,
    ...globals,
  }) as (this: object, ...args: unknown[]) => Promise<unknown>;
}

describe("existing Prisma profile and receipt contracts", () => {
  it("uses totalAmount as the exact PDF receipt amount and forwards its buffer", async () => {
    const amount = 1500.25;
    const invoice = {
      id: "invoice-1",
      advertiserId: "adv-1",
      totalAmount: amount,
      issueDate: new Date("2026-11-01"),
      dueDate: new Date("2026-11-15"),
      advertiser: {
        companyName: "Example advertiser",
        contactName: "Example contact",
      },
    };
    const pdf = Buffer.from("isolated-pdf");
    const generateTransactionReceiptPDF = jest.fn(
      async (receipt: { amount: number }) => {
        // This is the access made by the real PDF renderer; missing amount throws.
        receipt.amount.toLocaleString();
        expect(receipt.amount).toBe(amount);
        return pdf;
      },
    );
    const sendEmail = jest.fn(async () => ({ success: true }));
    const findUnique = jest.fn(async () => invoice);
    const method = loadMethod(
      path.join(__dirname, "finance.controller.ts"),
      "FinanceController",
      "emailAdvertiserInvoice",
    );
    const result = await method.call(
      {
        prisma: { invoice: { findUnique } },
        invoiceService: { generateTransactionReceiptPDF },
        emailService: { sendEmail },
      },
      "adv-1",
      "invoice-1",
      { email: "recipient@example.test" },
    );
    expect(result).toMatchObject({ success: true });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "invoice-1", advertiserId: "adv-1" },
      include: { advertiser: true },
    });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "recipient@example.test",
        attachments: [expect.objectContaining({ content: pdf })],
      }),
    );
  });

  it("selects the advertiser referrer relation and retains its scalar referral id", async () => {
    const advertiser = {
      id: "adv-1",
      referredBy: "driver-referrer",
      status: "ACTIVE",
      campaigns: [],
    };
    const findUnique = jest.fn(
      async (args: { select: Record<string, unknown> }) => {
        expect(args.select).toHaveProperty("referrer", {
          select: { id: true, fullName: true, phone: true },
        });
        expect(args.select).toHaveProperty("referredBy", true);
        expect(args.select).not.toHaveProperty("password");
        return advertiser;
      },
    );
    const method = loadMethod(
      path.join(__dirname, "../advertisers/advertisers.service.ts"),
      "AdvertisersService",
      "getAdminProfile",
    );
    const result = await method.call(
      { prisma: { advertiser: { findUnique } } },
      "adv-1",
    );
    expect(result).toMatchObject({
      referredBy: "driver-referrer",
      activeCampaigns: 0,
    });
  });

  it("sorts contract acceptance history using the persisted timestamp column", async () => {
    const findUnique = jest.fn(
      async (args: {
        include: {
          contractAcceptances: { orderBy: object; take: number };
          referrals?: object;
          referencedDrivers?: object;
        };
      }) => {
        expect(args.include.contractAcceptances).toEqual({
          orderBy: { timestamp: "desc" },
          take: 1,
        });
        expect(args.include).toHaveProperty("referrals");
        expect(args.include).not.toHaveProperty("referencedDrivers");
        return {
          id: "driver-1",
          onboardingStatus: "COMPLETED",
          referrals: [{ id: "referred-driver" }],
        };
      },
    );
    const method = loadMethod(
      path.join(__dirname, "../drivers/drivers.service.ts"),
      "DriversService",
      "getAdminProfile",
    );
    const result = await method.call(
      {
        prisma: {
          driver: { findUnique },
          payrollPayment: { findFirst: jest.fn(async () => null) },
        },
        hasBankAccountConfigured: jest.fn(async () => false),
      },
      "driver-1",
    );
    expect(result).toMatchObject({
      id: "driver-1",
      bankAccountConfigured: false,
      referencedDrivers: [{ id: "referred-driver" }],
    });
  });
});

describe("legacy advertiser reset containment contract", () => {
  it.each([
    "unstructured-verified-value",
    { purpose: "reset" },
    { purpose: "reset", sub: 42 },
    { purpose: "reset", sub: "adv-1" },
  ])(
    "rejects every legacy reset claim before verification, hashing or persistence: %p",
    async (payload) => {
      const update = jest.fn();
      const hash = jest.fn();
      const verify = jest.fn(() => payload);
      const get = jest.fn(() => "isolated-secret");
      const method = loadMethod(
        path.join(__dirname, "../advertisers/advertisers.service.ts"),
        "AdvertisersService",
        "resetPassword",
        { jwt: { verify }, bcrypt: { hash }, ServiceUnavailableException },
      );
      await expect(
        method.call(
          {
            configService: { get },
            logger: { error: jest.fn() },
            prisma: { advertiser: { update } },
          },
          "isolated-token",
          "new-password",
        ),
      ).rejects.toMatchObject({
        status: 503,
        response: { code: "ADVERTISER_PASSWORD_RECOVERY_UNAVAILABLE" },
      });
      expect(get).not.toHaveBeenCalled();
      expect(verify).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
      expect(hash).not.toHaveBeenCalled();
    },
  );
});
