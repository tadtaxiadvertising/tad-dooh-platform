import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { PrismaService } from "../prisma/prisma.service";
import { SupabaseService } from "../supabase/supabase.service";
import { firstValueFrom } from "rxjs";

const mediaAssetSafeSelect = {
  id: true,
  campaignId: true,
  type: true,
  filename: true,
  url: true,
  fileSize: true,
  checksum: true,
  duration: true,
  version: true,
  createdAt: true,
  qrUrl: true,
  weight: true,
};

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);
  private readonly REMOTION_URL: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly http: HttpService,
  ) {
    // Docker internal network URL for tad-remotion; falls back to localhost for dev
    this.REMOTION_URL =
      process.env.REMOTION_SERVICE_URL || "http://tad-remotion:8000";
  }

  async getAssetManifest(deviceId: string) {
    const now = new Date();

    // SEC-04: Only return assets for campaigns explicitly assigned to this device.
    // Previously, all active campaigns' assets were exposed to any device.
    const device = await this.prisma.device.findUnique({
      where: { deviceId },
      select: {
        id: true,
        city: true,
        campaigns: {
          select: { campaign_id: true },
        },
      },
    });

    if (!device) {
      return { manifest: {}, version: 0 };
    }

    const assignedCampaignIds = device.campaigns.map((dc) => dc.campaign_id);

    if (assignedCampaignIds.length === 0) {
      return { manifest: {}, version: 0 };
    }

    // Fetch only the active campaigns that are assigned to this device
    const activeCampaigns = await this.prisma.campaign.findMany({
      where: {
        id: { in: assignedCampaignIds },
        active: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        mediaAssets: { select: mediaAssetSafeSelect },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const manifest: Record<string, any> = {};
    for (const campaign of activeCampaigns) {
      for (const asset of campaign.mediaAssets) {
        manifest[asset.id] = {
          url: asset.url,
          checksum: asset.checksum,
          size: asset.fileSize,
          type: asset.type,
          filename: asset.filename,
        };
      }
    }

    return {
      manifest,
      version:
        activeCampaigns.length > 0 ? activeCampaigns[0].updatedAt.getTime() : 0,
    };
  }

  async handleAssetWebhook(payload: any) {
    this.logger.log(`📥 Webhook recibido: ${JSON.stringify(payload)}`);

    if (
      payload.type === "INVALID_ASSET" ||
      payload.record?.status === "INVALID_ASSET"
    ) {
      const assetId = payload.record?.id || payload.assetId;
      this.logger.warn(
        `⚠️ Asset inválido detectado (ID: ${assetId}). Iniciando recuperación automática...`,
      );

      // 1. Marcar el asset como FAILED inmediatamente
      if (assetId) {
        await this.prisma.mediaAsset
          .update({
            where: { id: assetId },
            data: {
              processingStatus: "FAILED",
              validationError:
                "Asset no cumple con requisitos H.264 o excedió el límite.",
            },
          })
          .catch((e) =>
            this.logger.error(`Error actualizando asset: ${e.message}`),
          );
      }

      // 2. Iniciar la recuperación automática en background (no bloquea el webhook response)
      this.triggerFallbackRender(assetId, payload).catch((err) => {
        this.logger.error(
          `❌ Recuperación automática falló para asset ${assetId}: ${err.message}`,
        );
      });
    }

    return { received: true };
  }

  /**
   * Orquesta la recuperación automática:
   *  1. Consulta los datos de la campaña asociada al asset fallido
   *  2. Genera una Signed Upload URL de Supabase (evita pasar el video por la RAM del backend)
   *  3. Llama a tad-remotion para renderizar un Fallback Ad y subirlo directo a Supabase
   *  4. Actualiza el registro MediaAsset a ACTIVE con la nueva URL pública
   */
  private async triggerFallbackRender(assetId: string, webhookPayload: any) {
    const startTime = Date.now();

    // --- PASO 1: Obtener datos de la campaña ---
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: assetId },
      include: { campaign: true },
    });

    if (!asset || !asset.campaign) {
      this.logger.error(
        `Asset ${assetId} no encontrado o sin campaña asociada. Abortando fallback.`,
      );
      return;
    }

    const campaign = asset.campaign;
    this.logger.log(
      `🔄 Generando fallback para campaña "${campaign.name}" (ID: ${campaign.id})`,
    );

    // --- PASO 2: Generar Signed Upload URL (el video va directo de Remotion → Supabase) ---
    const fallbackFileName = `fallback-${campaign.id}-${Date.now()}.mp4`;
    const storagePath = `campaigns/${campaign.id}/${fallbackFileName}`;
    const bucket = "campaign-videos";

    const client = this.supabase.getClient();
    const { data: signedData, error: signedError } = await client.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath);

    if (signedError || !signedData) {
      this.logger.error(
        `Error generando Signed Upload URL: ${signedError?.message}`,
      );
      throw new Error(`Signed URL generation failed: ${signedError?.message}`);
    }

    this.logger.log(`📝 Signed Upload URL generada para: ${storagePath}`);

    // --- PASO 3: Llamar a tad-remotion /api/process-fallback ---
    const fallbackPayload = {
      campaignId: campaign.id,
      uploadUrl: signedData.signedUrl,
      uploadToken: signedData.token,
      props: {
        primaryText: campaign.name || "Tu Anuncio Aquí",
        brandColor: "#e51636",
        secondaryText: "Anuncio generado automáticamente por TAD",
        logoUrl: "",
        bgUrl: "",
      },
    };

    this.logger.log(
      `🚀 Enviando solicitud de fallback render a ${this.REMOTION_URL}/api/process-fallback`,
    );

    const response = await firstValueFrom(
      this.http.post(
        `${this.REMOTION_URL}/api/process-fallback`,
        fallbackPayload,
        {
          timeout: 120_000, // 2 minutos máximo para el render
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    if (!response.data?.success) {
      throw new Error(
        `tad-remotion respondió sin éxito: ${JSON.stringify(response.data)}`,
      );
    }

    // --- PASO 4: Actualizar el MediaAsset con la nueva URL pública ---
    const publicUrl = this.supabase.getPublicUrl(storagePath, bucket);

    await this.prisma.mediaAsset.update({
      where: { id: assetId },
      data: {
        url: publicUrl,
        filename: fallbackFileName,
        processingStatus: "ACTIVE",
        validationError: null,
      },
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    this.logger.log(
      `✅ Recuperación automática completada en ${duration}s. Nuevo asset: ${publicUrl}`,
    );

    // --- PASO 5: Notificar al cliente vía Supabase Realtime ---
    await this.supabase
      .broadcastEvent(`campaign-${campaign.id}`, "ASSET_RECOVERED", {
        assetId,
        campaignId: campaign.id,
        newUrl: publicUrl,
        message: "Se generó un anuncio de respaldo automáticamente.",
      })
      .catch((err) =>
        this.logger.warn(`Broadcast falló (no crítico): ${err.message}`),
      );
  }
}
