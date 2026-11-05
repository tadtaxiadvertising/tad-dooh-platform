import { Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class VideoGeneratorService {
  private readonly logger = new Logger(VideoGeneratorService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly prisma: PrismaService,
  ) {}

  async generateAdVideo(
    campaignId: string,
    _props: {
      logoUrl: string;
      brandColor: string;
      primaryText: string;
      secondaryText: string;
    },
  ) {
    this.logger.warn(
      `🚫 Generación de video deshabilitada: no hay microservicio Remotion disponible para la campaña ${campaignId}.`,
    );
    throw new Error(
      "La generación de videos está deshabilitada por la eliminación del servicio Remotion.",
    );
  }
}
