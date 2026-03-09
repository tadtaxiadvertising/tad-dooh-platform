import { Injectable, UnauthorizedException, Logger, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`✅ Login exitoso: ${user.email}`);

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * Seed an initial admin user if none exist.
   * Call this on app bootstrap so there's always a way to log in.
   */
  async seedAdminUser() {
    const userCount = await this.prisma.user.count();
    if (userCount > 0) {
      this.logger.log('👤 Admin users exist, skip seeding');
      return;
    }

    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'TadAdmin2026!';
    const hash = await bcrypt.hash(defaultPassword, 10);

    await this.prisma.user.create({
      data: {
        email: 'admin@tad.do',
        password: hash,
        name: 'TAD Admin',
        role: 'ADMIN',
      },
    });

    this.logger.warn(`🔑 Default admin created: admin@tad.do / ${defaultPassword}`);
    this.logger.warn('⚠️  Change this password immediately in production!');
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }
}
