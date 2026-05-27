import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { prisma } from '@guaycampo/database';
import type { User } from '@guaycampo/database';
import type { IAuthTokens } from '@guaycampo/shared-types';
import type { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './strategies/jwt.strategy';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    const isValid = await bcrypt.compare(password, user.passwordHash);
    return isValid ? user : null;
  }

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async login(user: User): Promise<IAuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roleId: user.roleId ?? undefined,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.generateRefreshToken(user.id),
    ]);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const expiresIn = this.parseExpiresIn(
      this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
    );

    return { accessToken, refreshToken, expiresIn };
  }

  async register(dto: RegisterDto): Promise<IAuthTokens> {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant '${dto.tenantSlug}' not found`);
    }

    const existing = await prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        phone: dto.phone,
        passwordHash,
        tenantId: tenant.id,
        status: 'active',
      },
    });

    return this.login(user);
  }

  async refreshTokens(token: string): Promise<IAuthTokens> {
    const stored = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.findUserById(stored.userId);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found or inactive');
    }

    return this.login(user);
  }

  async getMe(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, tenant: true },
    });
    if (!user) throw new NotFoundException('User not found');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;
    return safeUser as Omit<User, 'passwordHash'>;
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    const daysToExpire = 7;
    const expiresAt = new Date(Date.now() + daysToExpire * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });

    return token;
  }

  private parseExpiresIn(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 900;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[unit] ?? 60);
  }
}
