import { AdvertiserBillingService } from "./advertiser-billing.service";

describe("Billing advertiser data minimization", () => {
  const findUnique = jest.fn();
  const findMany = jest.fn();
  const create = jest.fn();
  const subscriptionFindUnique = jest.fn();
  const service = new AdvertiserBillingService(
    {
      advertiser: { findUnique },
      invoice: { create },
      advertiserSubscription: {
        findMany,
        findUnique: subscriptionFindUnique,
      },
    } as never,
    {} as never,
    {} as never,
    {} as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    findUnique.mockResolvedValue({ companyName: "Fixture company" });
    create.mockImplementation(async ({ data }) => ({
      id: "invoice-fixture",
      ...data,
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("preserves proforma subtotal, tax, total and status without credentials", async () => {
    const result = await service.generateProformaInvoice({
      advertiserId: "advertiser-fixture",
      numberOfScreens: 3,
      monthlyRate: 2500,
      months: 2,
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "advertiser-fixture" },
      select: { companyName: true },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        advertiserId: "advertiser-fixture",
        subtotal: 15000,
        taxAmount: 2700,
        totalAmount: 17700,
        status: "PROFORMA",
      }),
    });
    expect(result).toMatchObject({
      subtotal: 15000,
      taxAmount: 2700,
      totalAmount: 17700,
      status: "PROFORMA",
    });
  });

  it("loads only billing contact fields for scheduled and manual billing", async () => {
    const subscription = {
      id: "subscription-fixture",
      advertiserId: "advertiser-fixture",
      advertiser: {
        companyName: "Fixture company",
        contactName: "Fixture contact",
        email: "fixture@example.invalid",
      },
    };
    findMany.mockResolvedValue([subscription]);
    subscriptionFindUnique.mockResolvedValue(subscription);
    const process = jest
      .spyOn(service, "processSubscriptionBilling")
      .mockResolvedValue(undefined);
    await expect(service.runMonthlySubscriptionBilling()).resolves.toEqual({
      processed: 1,
      failed: 0,
    });
    await service.billSubscriptionNow(subscription.id);
    const include = {
      advertiser: {
        select: { companyName: true, contactName: true, email: true },
      },
    };
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include }),
    );
    expect(subscriptionFindUnique).toHaveBeenCalledWith({
      where: { id: subscription.id },
      include,
    });
    expect(process).toHaveBeenCalledTimes(2);
    expect(process).toHaveBeenCalledWith(subscription);
  });
});
