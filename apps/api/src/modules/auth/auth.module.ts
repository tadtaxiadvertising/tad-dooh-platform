import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SupabaseStrategy } from './strategies/supabase.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // Prefer SUPABASE_JWT_SECRET for local validation (no network call).
        // Fallback to JWT_SECRET for backward compatibility.
        secret:
          config.get<string>('SUPABASE_JWT_SECRET') ||
          config.get<string>('JWT_SECRET') ||
          'tad-default-secret-change-me-in-production',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SupabaseStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
