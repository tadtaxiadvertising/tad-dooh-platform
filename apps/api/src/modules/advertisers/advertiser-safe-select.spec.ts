import { advertiserSafeSelect } from "./advertiser-safe-select";
import { AdvertisersService } from "./advertisers.service";

describe("Advertiser commercial response projection", () => {
  const row = {
    id: "fixture-advertiser",
    companyName: "Fixture company",
    email: "fixture@example.invalid",
    password: "synthetic-credential-sentinel",
  };
  const project = ({
    select,
  }: {
    select: Record<string, unknown>;
  }): Record<string, unknown> => {
    expect(select).toMatchObject(advertiserSafeSelect);
    expect(select).not.toHaveProperty("password");
    return Object.fromEntries(
      Object.entries(row).filter(([key]) => select[key] === true),
    );
  };
  const findMany = jest.fn(async (args) => [project(args)]);
  const findUnique = jest.fn(async (args) => ({
    ...project(args),
    campaigns: [],
  }));
  const create = jest.fn(async (args) => project(args));
  const update = jest.fn(async (args) => project(args));
  const remove = jest.fn(async (args) => project(args));
  const deleteMany = jest.fn(async () => ({ count: 0 }));
  const service = new AdvertisersService(
    {
      advertiser: { findMany, findUnique, create, update, delete: remove },
      campaign: { deleteMany },
    } as never,
    {} as never,
  );

  it("keeps business fields and excludes the credential from commercial results", async () => {
    const responses = [
      ...(await service.findAll()),
      await service.findOne(row.id),
      await service.getAdminProfile(row.id),
      await service.create({
        companyName: row.companyName,
        contactName: "Fixture contact",
        email: row.email,
      }),
      await service.update(row.id, { companyName: row.companyName }),
      await service.remove(row.id),
    ];
    for (const response of responses) {
      expect(response).toMatchObject({
        id: row.id,
        companyName: row.companyName,
        email: row.email,
      });
      expect(response).not.toHaveProperty("password");
    }
  });
});
