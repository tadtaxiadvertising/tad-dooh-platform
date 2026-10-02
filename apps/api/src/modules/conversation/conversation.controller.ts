import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  BadRequestException,
  NotFoundException,
  UseInterceptors,
  Logger,
} from "@nestjs/common";
import {
  ConversationService,
  CreateConversationInput,
  AddMessageInput,
  UpdateConversationInput,
} from "./conversation.service";
import { IdempotencyInterceptor } from "../../common/interceptors/idempotency.interceptor";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";

@Controller("conversations")
export class ConversationController {
  private readonly logger = new Logger(ConversationController.name);

  constructor(private readonly conversationService: ConversationService) {}

  /**
   * POST /api/conversations — Crear o recuperar conversación por threadId
   * Idempotente por threadId único
   * Body: { platform, threadId, contactPhone?, contactName?, leadId?, driverId?, advertiserId?, metadata? }
   */
  @Post()
  @UseInterceptors(IdempotencyInterceptor)
  async findOrCreate(@Body() body: CreateConversationInput) {
    if (!body.platform || !body.threadId) {
      throw new BadRequestException("platform y threadId son requeridos");
    }

    if (!["WHATSAPP", "MESSENGER", "INSTAGRAM"].includes(body.platform)) {
      throw new BadRequestException(
        "platform debe ser WHATSAPP, MESSENGER o INSTAGRAM",
      );
    }

    const result =
      await this.conversationService.findOrCreateConversation(body);
    return { success: true, ...result };
  }

  /**
   * POST /api/conversations/:id/messages — Añadir mensaje a conversación
   * Body: { direction, content, messageType?, metaMessageId? }
   */
  @Post(":id/messages")
  @Roles(UserRole.ADMIN)
  @UseInterceptors(IdempotencyInterceptor)
  async addMessage(@Param("id") id: string, @Body() body: AddMessageInput) {
    if (!body.direction || !body.content) {
      throw new BadRequestException("direction y content son requeridos");
    }

    if (!["INBOUND", "OUTBOUND"].includes(body.direction)) {
      throw new BadRequestException("direction debe ser INBOUND u OUTBOUND");
    }

    const message = await this.conversationService.addMessage({
      ...body,
      conversationId: id,
    });
    return { success: true, message };
  }

  /**
   * PUT /api/conversations/:id — Actualizar estado/etapa de conversación
   * Body: { status?, stage?, consentGiven?, assignedTo?, metadata? }
   */
  @Put(":id")
  @Roles(UserRole.ADMIN)
  @UseInterceptors(IdempotencyInterceptor)
  async updateConversation(
    @Param("id") id: string,
    @Body() body: UpdateConversationInput,
  ) {
    const conversation = await this.conversationService.updateConversation(
      id,
      body,
    );
    return { success: true, conversation };
  }

  /**
   * PUT /api/conversations/:id/handoff — Transferir a operador humano
   * Body: { assignedTo }
   */
  @Put(":id/handoff")
  @Roles(UserRole.ADMIN)
  @UseInterceptors(IdempotencyInterceptor)
  async handoff(@Param("id") id: string, @Body() body: { assignedTo: string }) {
    if (!body.assignedTo) {
      throw new BadRequestException("assignedTo es requerido");
    }

    const conversation = await this.conversationService.handoffToHuman(
      id,
      body.assignedTo,
    );
    return { success: true, conversation };
  }

  /**
   * PUT /api/conversations/:id/close — Cerrar conversación
   */
  @Put(":id/close")
  @Roles(UserRole.ADMIN)
  @UseInterceptors(IdempotencyInterceptor)
  async close(@Param("id") id: string) {
    const conversation = await this.conversationService.closeConversation(id);
    return { success: true, conversation };
  }

  /**
   * GET /api/conversations/:id — Obtener conversación con mensajes
   */
  @Get(":id")
  @Roles(UserRole.ADMIN)
  async getById(@Param("id") id: string) {
    const conversation = await this.conversationService.getConversation(id);
    return { success: true, conversation };
  }

  /**
   * GET /api/conversations/thread/:threadId — Obtener conversación por threadId
   */
  @Get("thread/:threadId")
  @Roles(UserRole.ADMIN)
  async getByThreadId(@Param("threadId") threadId: string) {
    const conversation =
      await this.conversationService.getConversationByThreadId(threadId);
    if (!conversation) {
      throw new NotFoundException(
        `Conversation with threadId ${threadId} not found`,
      );
    }
    return { success: true, conversation };
  }

  /**
   * GET /api/conversations — Listar conversaciones con filtros
   * Query: status, stage, platform, driverId, advertiserId, leadId, assignedTo, limit, offset
   */
  @Get()
  @Roles(UserRole.ADMIN)
  async list(
    @Query("status") status?: string,
    @Query("stage") stage?: string,
    @Query("platform") platform?: string,
    @Query("driverId") driverId?: string,
    @Query("advertiserId") advertiserId?: string,
    @Query("leadId") leadId?: string,
    @Query("assignedTo") assignedTo?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    const result = await this.conversationService.listConversations({
      status,
      stage,
      platform,
      driverId,
      advertiserId,
      leadId,
      assignedTo,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    return { success: true, ...result };
  }

  /**
   * GET /api/conversations/stats — Estadísticas de conversaciones
   */
  @Get("stats")
  @Roles(UserRole.ADMIN)
  async getStats(@Query("days") days?: string) {
    const d = days ? parseInt(days, 10) : 30;
    if (isNaN(d) || d < 1 || d > 365) {
      throw new BadRequestException("days debe ser entre 1 y 365");
    }

    const stats = await this.conversationService.getStats(d);
    return { success: true, stats };
  }
}
