import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
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
  async handleWebhook(@Body() payload: any) {
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
