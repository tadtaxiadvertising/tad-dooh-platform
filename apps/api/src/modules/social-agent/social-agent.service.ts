import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { firstValueFrom } from "rxjs";

interface MetaInteraction {
  sender?: { id?: string };
  from?: { id?: string };
  thread_id?: string;
  message?: { text?: string };
  text?: string;
}

interface MetaWebhook {
  object?: string;
  entry?: Array<{
    messaging?: MetaInteraction[];
    changes?: Array<{ value?: MetaInteraction }>;
  }>;
}

@Injectable()
export class SocialAgentService {
  private readonly logger = new Logger(SocialAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  @Cron("0 8 * * *") // Daily at 08:00 AM
  async handleDailyGeneration() {
    this.logger.log("Starting daily social content generation...");
    try {
      // 1. Get metrics and multiply by 2
      const activeDevicesCount = await this.prisma.device.count({
        where: {
          status: "OPERATIVO",
          isOnline: true,
        },
      });
      const marketingMetric = activeDevicesCount * 2;

      // 2. Generate Image (DALL-E 3)
      const imageUrl = await this.generateImage(
        "composición maestra, profesional, publicitaria orientada a B2B para TAD publicidad en taxis en Santiago RD",
      );

      // 3. Generate Copy (LLM)
      const copy = await this.generateCopy(marketingMetric);

      // 4. Save as PENDING draft
      const draft = await this.prisma.socialPostDraft.create({
        data: {
          platform: "IG/FB",
          copy,
          mediaUrl: imageUrl,
          status: "PENDING",
          scheduledFor: new Date(), // Default to now, can be adjusted in admin
        },
      });

      // 5. Create HumanReviewTask for mandatory human approval before publishing
      await this.prisma.humanReviewTask.create({
        data: {
          type: "SOCIAL_POST",
          entityId: draft.id,
          entityType: "SocialPostDraft",
          status: "PENDING",
          payload: {
            platform: draft.platform,
            copy: draft.copy,
            mediaUrl: draft.mediaUrl,
            scheduledFor: draft.scheduledFor,
          },
        },
      });

      this.logger.log(
        `Daily social content draft ${draft.id} created with HumanReviewTask for approval.`,
      );
    } catch (error) {
      this.logger.error("Error in daily content generation:", error);
    }
  }

  async handleMetaWebhook(payload: MetaWebhook) {
    // Asynchronous processing to not block Meta's response
    this.processMetaInteraction(payload).catch((err) =>
      this.logger.error("Error processing Meta interaction:", err),
    );
    return { status: "received" };
  }

  private async processMetaInteraction(payload: MetaWebhook) {
    // Extract info from Meta payload (simplified for now)
    // payload structure depends on Meta Graph API Webhook format
    const entry = payload.entry?.[0];
    const messaging = entry?.messaging?.[0] || entry?.changes?.[0]?.value;

    if (!messaging) return;

    const senderId = messaging.sender?.id || messaging.from?.id;
    const threadId = messaging.thread_id || senderId;
    const messageText = messaging.message?.text || messaging.text;
    const platform = payload.object === "instagram" ? "IG" : "FB";

    if (!messageText || !senderId) return;

    // Strict System Prompt
    const systemPrompt = `Eres TAD Bot, asistente de ventas B2B para publicidad en taxis en Santiago, RD. Reglas inquebrantables: 1) Nunca inventes precios, el costo base es 500 RD$ por CPA o reproducción estándar. 2) No ofrezcas servicios fuera de pantallas en taxis. 3) Si preguntan detalles técnicos o negociaciones mayores, responde que un agente humano los contactará y solicita su teléfono. 4) Usa tono profesional, cortés e invita a anunciar su negocio local.`;

    try {
      const response = await this.callLLM(systemPrompt, messageText);

      // Save interaction log
      await this.prisma.socialInteractionLog.create({
        data: {
          platform,
          threadId: String(threadId),
          senderId: String(senderId),
          message: messageText,
          botResponse: response,
        },
      });

      // Send response back to Meta
      await this.sendMetaMessage(platform, senderId, response);
    } catch (error) {
      this.logger.error("LLM Interaction failed, using fallback:", error);
      const fallbackResponse =
        "Gracias por contactar a TAD. Un agente humano se pondrá en contacto con usted pronto para brindarle más detalles.";
      await this.sendMetaMessage(platform, senderId, fallbackResponse);
    }
  }

  /**
   * BLOQUEADO: Publicación directa a Meta Graph API.
   * Ahora crea un HumanReviewTask y espera aprobación humana explícita.
   * Use publishApprovedPost(taskId) tras revisión humana.
   */
  async publishPost(draftId: string) {
    const draft = await this.prisma.socialPostDraft.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new BadRequestException("Draft not found");
    }

    if (draft.status === "PUBLISHED") {
      throw new BadRequestException("Draft already published");
    }

    if (draft.status === "REJECTED") {
      throw new BadRequestException("Cannot publish rejected draft");
    }

    // Create HumanReviewTask for mandatory approval
    const existingTask = await this.prisma.humanReviewTask.findFirst({
      where: {
        entityId: draftId,
        entityType: "SocialPostDraft",
        status: "PENDING",
      },
    });

    if (existingTask) {
      throw new BadRequestException({
        code: "REVIEW_PENDING",
        message: "Draft already has a pending human review task",
        taskId: existingTask.id,
      });
    }

    const task = await this.prisma.humanReviewTask.create({
      data: {
        type: "SOCIAL_POST",
        entityId: draftId,
        entityType: "SocialPostDraft",
        status: "PENDING",
        payload: {
          platform: draft.platform,
          copy: draft.copy,
          mediaUrl: draft.mediaUrl,
          scheduledFor: draft.scheduledFor,
        },
      },
    });

    this.logger.log(
      `Created HumanReviewTask ${task.id} for draft ${draftId} — awaiting human approval.`,
    );

    return {
      success: true,
      taskId: task.id,
      message:
        "Draft submitted for human review. Publish will proceed after approval.",
    };
  }

  /**
   * Publica a Meta Graph API SOLO tras aprobación humana (HumanReviewTask APPROVED).
   * Este método es invocado por el controlador tras validar que el task está APPROVED.
   */
  async publishApprovedPost(taskId: string, reviewerId: string) {
    const task = await this.prisma.humanReviewTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new BadRequestException("Review task not found");
    }

    if (task.entityType !== "SocialPostDraft") {
      throw new BadRequestException("Task is not for a social post");
    }

    if (task.status !== "APPROVED") {
      throw new ForbiddenException({
        code: "NOT_APPROVED",
        message: `Task status is ${task.status}. Must be APPROVED to publish.`,
        taskStatus: task.status,
      });
    }

    const draft = await this.prisma.socialPostDraft.findUnique({
      where: { id: task.entityId },
    });

    if (!draft) {
      throw new BadRequestException("Associated draft not found");
    }

    if (draft.status === "PUBLISHED") {
      throw new BadRequestException("Draft already published");
    }

    // Call Meta Graph API to publish
    // This requires META_ACCESS_TOKEN and Page/Account IDs
    this.logger.log(
      `Publishing draft ${draft.id} to Meta (task ${taskId} approved by ${reviewerId})...`,
    );

    const accessToken = this.configService.get<string>("META_ACCESS_TOKEN");
    if (!accessToken) {
      this.logger.error("META_ACCESS_TOKEN not configured — cannot publish");
      throw new BadRequestException("META_ACCESS_TOKEN not configured");
    }

    // Build the Meta Graph API call based on platform
    // For IG/FB page posts: POST /{page-id}/feed with message, attached_media, etc.
    const pageId = this.configService.get<string>("META_PAGE_ID");
    if (!pageId) {
      this.logger.error("META_PAGE_ID not configured — cannot publish");
      throw new BadRequestException("META_PAGE_ID not configured");
    }

    try {
      // For image posts: first upload photo to get media_fbid, then post with attached_media
      // Simplified: use /feed with message and link/image URL if supported
      // Real implementation depends on whether it's a Page post, IG media, etc.
      const url = `https://graph.facebook.com/v21.0/${pageId}/feed`;

      const response = await firstValueFrom(
        this.httpService.post(
          url,
          {
            message: draft.copy,
            // For link/image posts, Meta may need different fields
            // This is a simplified version — production needs proper media handling
            link: draft.mediaUrl, // or use attached_media with uploaded photo ID
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        ),
      );

      await this.prisma.$transaction([
        this.prisma.socialPostDraft.update({
          where: { id: draft.id },
          data: { status: "PUBLISHED" },
        }),
        this.prisma.humanReviewTask.update({
          where: { id: taskId },
          data: {
            reviewerId,
            reviewedAt: new Date(),
            reviewNote: "Published to Meta Graph API",
          },
        }),
      ]);

      this.logger.log(
        `✅ Draft ${draft.id} published to Meta successfully (task ${taskId}).`,
      );
      return { success: true, metaResponse: response.data };
    } catch (error) {
      this.logger.error(
        "Meta Graph API publish failed:",
        error.response?.data || error.message,
      );
      throw new BadRequestException({
        code: "META_PUBLISH_FAILED",
        message: "Failed to publish to Meta Graph API",
        details: error.response?.data || error.message,
      });
    }
  }

  /**
   * Lista tasks de revisión pendientes para admins
   */
  async getPendingReviews() {
    return this.prisma.humanReviewTask.findMany({
      where: {
        type: "SOCIAL_POST",
        entityType: "SocialPostDraft",
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });
  }

  private async generateImage(prompt: string): Promise<string> {
    const apiKey = this.configService.get<string>("OPENAI_API_KEY");
    if (!apiKey) {
      this.logger.warn("OPENAI_API_KEY not found, using placeholder image");
      return "https://via.placeholder.com/1024x1024.png?text=TAD+Publicidad+Santiago";
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          "https://api.openai.com/v1/images/generations",
          {
            model: "dall-e-3",
            prompt,
            n: 1,
            size: "1024x1024",
          },
          {
            headers: { Authorization: `Bearer ${apiKey}` },
          },
        ),
      );
      return response.data.data[0].url;
    } catch (error) {
      this.logger.error(
        "DALL-E Generation failed:",
        error.response?.data || error.message,
      );
      return "https://via.placeholder.com/1024x1024.png?text=TAD+Publicidad+Santiago";
    }
  }

  private async generateCopy(metric: number): Promise<string> {
    const apiKey = this.configService.get<string>("OPENAI_API_KEY");
    const prompt = `Genera un copy publicitario atractivo para Instagram/Facebook enfocado en negocios locales en Santiago, República Dominicana. Menciona que tenemos más de ${metric} impactos activos garantizados hoy. El tono debe ser profesional y B2B, invitando a las empresas a anunciarse en nuestra red de pantallas en taxis.`;

    if (!apiKey)
      return `¡Impulsa tu negocio en Santiago! Con TAD, llegas a miles. Más de ${metric} pantallas activas hoy. Contáctanos.`;

    try {
      const response = await this.callLLM(
        "Eres un experto en marketing digital B2B para República Dominicana.",
        prompt,
      );
      return response;
    } catch (error) {
      return `¡Impulsa tu negocio en Santiago! Con TAD, llegas a miles. Más de ${metric} pantallas activas hoy. Contáctanos.`;
    }
  }

  private async callLLM(system: string, user: string): Promise<string> {
    const apiKey = this.configService.get<string>("OPENAI_API_KEY");
    const response = await firstValueFrom(
      this.httpService.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          timeout: 5000, // 5s timeout rule
        },
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        },
      ),
    );
    return response.data.choices[0].message.content;
  }

  private async sendMetaMessage(
    platform: string,
    recipientId: string,
    text: string,
  ) {
    const accessToken = this.configService.get<string>("META_ACCESS_TOKEN");
    if (!accessToken) {
      this.logger.warn("META_ACCESS_TOKEN not found, skipping message send");
      return;
    }

    const url =
      platform === "IG"
        ? `https://graph.facebook.com/v21.0/me/messages?access_token=${accessToken}`
        : `https://graph.facebook.com/v21.0/me/messages?access_token=${accessToken}`;

    try {
      await firstValueFrom(
        this.httpService.post(url, {
          recipient: { id: recipientId },
          message: { text },
        }),
      );
    } catch (error) {
      this.logger.error(
        "Failed to send Meta message:",
        error.response?.data || error.message,
      );
    }
  }
}
