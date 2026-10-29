// apps/api/src/modules/onboarding/onboarding.module.ts
import { Module } from "@nestjs/common";
import { OnboardingService } from "./onboarding.service";
import { OnboardingController } from "./onboarding.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { SupabaseModule } from "../supabase/supabase.module";

@Module({
  imports: [PrismaModule, SupabaseModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
