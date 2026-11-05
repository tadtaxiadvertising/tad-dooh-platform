export interface MediaAsset {
  id: string;
  filename: string;
  originalFilename?: string;
  url?: string;
  cdnUrl?: string;
  size: number;
  mimeType?: string;
  mime_type?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  status?: string;
  createdAt: string;
  qrUrl?: string;
  campaign_id?: string;
  campaign?: { id?: string; name?: string; active?: boolean } | null;
}

export interface MediaUploadSource extends Partial<MediaAsset> {
  mediaId?: string;
  name?: string;
  fileSize?: number;
  verified?: boolean;
}

export function normalizeUploadedMedia(input: MediaUploadSource): MediaAsset {
  const id = input.id || input.mediaId;
  if (!id)
    throw new Error("La subida no devolvió un identificador de archivo.");
  return {
    id,
    filename: input.filename || input.name || "",
    originalFilename: input.originalFilename,
    url: input.url || input.cdnUrl,
    cdnUrl: input.cdnUrl,
    size: input.size || input.fileSize || 0,
    mimeType: input.mimeType,
    mime_type: input.mime_type,
    durationSeconds: input.durationSeconds,
    width: input.width,
    height: input.height,
    status: input.status || "READY",
    createdAt: new Date().toISOString(),
    qrUrl: input.qrUrl,
    campaign_id: input.campaign_id,
    campaign: input.campaign || null,
  };
}
