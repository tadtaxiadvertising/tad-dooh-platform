/**
 * Keep the legacy wire name while Prisma persists only canonical mimeType.
 * This projects a response; it never adds a second database field or mutates
 * the record returned by Prisma.
 */
export function withMediaMimeAliases<T extends { mimeType: string | null }>(
  media: T,
): T & { mime_type: T["mimeType"] } {
  return { ...media, mime_type: media.mimeType };
}
