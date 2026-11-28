import type { Prisma } from "@prisma/client";

/**
 * Explicit commercial projection. New scalar fields are private by default
 * until reviewed here. Password hashes must never leave authentication code.
 */
export const advertiserSafeSelect = {
  id: true,
  companyName: true,
  contactName: true,
  email: true,
  phone: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  facebook: true,
  instagram: true,
  productsData: true,
  websiteUrl: true,
  whatsapp: true,
  category: true,
  pedidosYaUrl: true,
  uberEatsUrl: true,
  referredBy: true,
} as const satisfies Prisma.AdvertiserSelect;
