import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateConversationInput {
  platform: "WHATSAPP" | "MESSENGER" | "INSTAGRAM";
  threadId: string;
  contactPhone?: string;
  contactName?: string;
  leadId?: string;
  driverId?: string;
  advertiserId?: string;
  metadata?: Record<string, any>;
}

export interface AddMessageInput {
  conversationId: string;
  direction: "INBOUND" | "OUTBOUND";
  content: string;
  messageType?: "TEXT" | "IMAGE" | "DOCUMENT" | "TEMPLATE";
  metaMessageId?: string;
}

export interface UpdateConversationInput {
  status?: "OPEN" | "HANDOFF" | "CLOSED" | "BLOCKED";
  stage?:
    | "INITIAL"
    | "QUALIFYING"
    | "PAYMENT_PENDING"
    | "HUMAN_REVIEW"
    | "COMPLETED";
  consentGiven?: boolean;
  assignedTo?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea o recupera una conversación por threadId (idempotente).
   * Si ya existe, la retorna; si no, la crea.
   */
  async findOrCreateConversation(input: CreateConversationInput) {
    this.logger.log(
      `[CONVERSATION] Find or create: ${input.platform} thread ${input.threadId}`,
    );

    // Buscar por threadId único
    let conversation = await this.prisma.conversation.findUnique({
      where: { threadId: input.threadId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
    });

    if (conversation) {
      // Actualizar campos si vienen nuevos datos
      const updates: any = {};
      if (input.contactPhone && !conversation.contactPhone)
        updates.contactPhone = input.contactPhone;
      if (input.contactName && !conversation.contactName)
        updates.contactName = input.contactName;
      if (input.leadId && !conversation.leadId) updates.leadId = input.leadId;
      if (input.driverId && !conversation.driverId)
        updates.driverId = input.driverId;
      if (input.advertiserId && !conversation.advertiserId)
        updates.advertiserId = input.advertiserId;
      if (input.metadata) {
        updates.metadata = {
          ...((conversation.metadata as Record<string, any>) || {}),
          ...input.metadata,
        };
      }

      if (Object.keys(updates).length > 0) {
        conversation = await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: updates,
          include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
        });
      }

      return { conversation, created: false };
    }

    // Crear nueva
    conversation = await this.prisma.conversation.create({
      data: {
        platform: input.platform,
        threadId: input.threadId,
        contactPhone: input.contactPhone,
        contactName: input.contactName,
        leadId: input.leadId,
        driverId: input.driverId,
        advertiserId: input.advertiserId,
        metadata: input.metadata || {},
        status: "OPEN",
        stage: "INITIAL",
        consentGiven: false,
      },
      include: { messages: true },
    });

    this.logger.log(
      `[CONVERSATION] Created new conversation ${conversation.id} for thread ${input.threadId}`,
    );
    return { conversation, created: true };
  }

  /**
   * Añade un mensaje a la conversación.
   * Actualiza updatedAt de la conversación.
   */
  async addMessage(input: AddMessageInput) {
    const {
      conversationId,
      direction,
      content,
      messageType = "TEXT",
      metaMessageId,
    } = input;

    this.logger.log(
      `[CONVERSATION] Adding ${direction} message to ${conversationId}`,
    );

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    const message = await this.prisma.conversationMessage.create({
      data: {
        conversationId,
        direction,
        content,
        messageType,
        metaMessageId,
        status: "SENT",
      },
    });

    // Actualizar updatedAt de la conversación
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  /**
   * Actualiza el estado/etapa de una conversación.
   */
  async updateConversation(
    conversationId: string,
    input: UpdateConversationInput,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    const updates: any = { ...input };
    if (input.consentGiven === true && !conversation.consentAt) {
      updates.consentAt = new Date();
    }
    if (input.status === "CLOSED" && !conversation.closedAt) {
      updates.closedAt = new Date();
    }

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: updates,
      include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
    });
  }

  /**
   * Transfiere conversación a operador humano (HANDOFF).
   */
  async handoffToHuman(conversationId: string, assignedTo: string) {
    return this.updateConversation(conversationId, {
      status: "HANDOFF",
      stage: "HUMAN_REVIEW",
      assignedTo,
    });
  }

  /**
   * Cierra conversación.
   */
  async closeConversation(conversationId: string) {
    return this.updateConversation(conversationId, {
      status: "CLOSED",
      stage: "COMPLETED",
    });
  }

  /**
   * Obtiene conversación con mensajes.
   */
  async getConversation(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    return conversation;
  }

  /**
   * Obtiene conversación por threadId.
   */
  async getConversationByThreadId(threadId: string) {
    return this.prisma.conversation.findUnique({
      where: { threadId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 100 } },
    });
  }

  /**
   * Lista conversaciones con filtros.
   */
  async listConversations(filters: {
    status?: string;
    stage?: string;
    platform?: string;
    driverId?: string;
    advertiserId?: string;
    leadId?: string;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.stage) where.stage = filters.stage;
    if (filters.platform) where.platform = filters.platform;
    if (filters.driverId) where.driverId = filters.driverId;
    if (filters.advertiserId) where.advertiserId = filters.advertiserId;
    if (filters.leadId) where.leadId = filters.leadId;
    if (filters.assignedTo) where.assignedTo = filters.assignedTo;

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: filters.limit || 50,
        skip: filters.offset || 0,
        include: { messages: { orderBy: { createdAt: "desc" }, take: 5 } },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return { conversations, total };
  }

  /**
   * Estadísticas de conversaciones.
   */
  async getStats(days: number = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [total, byStatus, byStage, byPlatform, withConsent, handoffs] =
      await Promise.all([
        this.prisma.conversation.count({
          where: { createdAt: { gte: since } },
        }),
        this.prisma.conversation.groupBy({
          by: ["status"],
          where: { createdAt: { gte: since } },
          _count: { id: true },
        }),
        this.prisma.conversation.groupBy({
          by: ["stage"],
          where: { createdAt: { gte: since } },
          _count: { id: true },
        }),
        this.prisma.conversation.groupBy({
          by: ["platform"],
          where: { createdAt: { gte: since } },
          _count: { id: true },
        }),
        this.prisma.conversation.count({
          where: { consentGiven: true, createdAt: { gte: since } },
        }),
        this.prisma.conversation.count({
          where: { status: "HANDOFF", createdAt: { gte: since } },
        }),
      ]);

    return {
      periodDays: days,
      totalConversations: total,
      byStatus: byStatus.reduce(
        (acc, s) => ({ ...acc, [s.status]: s._count.id }),
        {},
      ),
      byStage: byStage.reduce(
        (acc, s) => ({ ...acc, [s.stage]: s._count.id }),
        {},
      ),
      byPlatform: byPlatform.reduce(
        (acc, s) => ({ ...acc, [s.platform]: s._count.id }),
        {},
      ),
      consentRate: total > 0 ? (withConsent / total) * 100 : 0,
      handoffRate: total > 0 ? (handoffs / total) * 100 : 0,
    };
  }
}
