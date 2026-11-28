/**
 * Prisma stores one physical media MIME field (media.mime_type).
 * Keep the historical response aliases without introducing a second DB field.
 */
export function withLegacyMediaMime<T extends { mimeType: string | null }>(
  media: T,
): T & { mime_type: string | null } {
  return { ...media, mime_type: media.mimeType };
}

export function withLegacyCampaignMedia<
  T extends { media: readonly { mimeType: string | null }[] },
>(campaign: T) {
  return {
    ...campaign,
    media: campaign.media.map(withLegacyMediaMime),
  };
}
