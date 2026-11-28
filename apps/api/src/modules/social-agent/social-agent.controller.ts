import type { AuthenticatedRequest } from "../auth/auth.types";
import {
  Controller,
  ConflictException,
  ForbiddenException,
  Get,
  Post,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  Req,
} from "@nestjs/common";
import { SocialAgentService } from "./social-agent.service";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { Public } from "../auth/decorators/public.decorator";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";

@Controller("social-agent")
export class SocialAgentController {
  private readonly logger = new Logger(SocialAgentController.name);

  constructor(
    private readonly socialAgentService: SocialAgentService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("webhooks/meta")
  @Public() // Meta must call this without JWT
  verifyWebhook(
    @Query("hub.mode") mode: string,
    @Query("hub.verify_token") token: string,
    @Query("hub.challenge") challenge: string,
  ) {
    const verifyToken = this.configService.get<string>("META_VERIFY_TOKEN");
    if (mode === "subscribe" && token === verifyToken) {
      this.logger.log("Meta Webhook verified successfully.");
      return challenge;
    }
    return "Verification failed";
  }

  @Post("webhooks/meta")
  @HttpCode(HttpStatus.OK)
  @Public() // Meta webhook callbacks carry no JWT
  async handleWebhook(
    @Body() payload: Parameters<SocialAgentService["handleMetaWebhook"]>[0],
  ) {
    return this.socialAgentService.handleMetaWebhook(payload);
  }

  @Get("drafts")
  @Roles(UserRole.ADMIN)
  async getDrafts() {
    return this.prisma.socialPostDraft.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
  }

  @Get("reviews/pending")
  @Roles(UserRole.ADMIN)
  async getPendingReviews() {
    return this.socialAgentService.getPendingReviews();
  }

  @Post("review/:id/approve")
  @Roles(UserRole.ADMIN)
  async approveReview(
    @Param("id") taskId: string,
    @Body() body: { note?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.decideSocialReview(taskId, "APPROVED", body.note, req);
  }

  @Post("review/:id/reject")
  @Roles(UserRole.ADMIN)
  async rejectReview(
    @Param("id") taskId: string,
    @Body() body: { note?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.decideSocialReview(taskId, "REJECTED", body.note, req);
  }

  private async decideSocialReview(
    taskId: string,
    status: "APPROVED" | "REJECTED",
    note: string | undefined,
    req: AuthenticatedRequest,
  ) {
    const reviewerId = req.user?.id;
    if (req.user?.role !== UserRole.ADMIN || !reviewerId) {
      throw new ForbiddenException("Social review operator required");
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.humanReviewTask.updateMany({
        where: {
          id: taskId,
          type: "SOCIAL_POST",
          entityType: "SocialPostDraft",
          status: "PENDING",
        },
        data: {
          status,
          reviewerId,
          reviewedAt: new Date(),
          reviewNote:
            note ||
            (status === "APPROVED" ? "Approved by admin" : "Rejected by admin"),
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException("Pending social review task required");
      }
      const task = await tx.humanReviewTask.findUniqueOrThrow({
        where: { id: taskId },
      });
      return { success: true, task };
    });
  }

  @Post("publish-approved/:taskId")
  @Roles(UserRole.ADMIN)
  async publishApprovedPost(
    @Param("taskId") taskId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const reviewerId = req.user?.sub || req.user?.id || "unknown-admin";
    return this.socialAgentService.publishApprovedPost(taskId, reviewerId);
  }

  @Post("approve/:id")
  @Roles(UserRole.ADMIN)
  async approveDraft(@Param("id") id: string) {
    return this.socialAgentService.publishPost(id);
  }

  @Post("reject/:id")
  @Roles(UserRole.ADMIN)
  async rejectDraft(@Param("id") id: string) {
    await this.prisma.socialPostDraft.update({
      where: { id },
      data: { status: "REJECTED" },
    });
    return { success: true };
  }

  @Post("trigger-cron")
  @Roles(UserRole.ADMIN)
  async triggerCron() {
    // Manually trigger for testing
    this.socialAgentService.handleDailyGeneration();
    return { message: "Generation triggered" };
  }
}
