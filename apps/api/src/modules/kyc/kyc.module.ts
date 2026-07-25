import { Module } from '@nestjs/common';
import { KYCService } from './kyc.service';

@Module({
  providers: [KYCService],
  exports: [KYCService],
})
export class KYCModule {}