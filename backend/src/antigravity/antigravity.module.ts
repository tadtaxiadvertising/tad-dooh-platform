import { Module } from '@nestjs/common';
import { AntigravityService } from './antigravity.service';

@Module({
  providers: [AntigravityService],
  exports: [AntigravityService],
})
export class AntigravityModule {}
