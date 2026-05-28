import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { prisma } from '@guaycampo/database';
import type { CreateTenantDto } from './dto/create-tenant.dto';
import type { UpdateTenantDto } from './dto/update-tenant.dto';

const BCRYPT_ROUNDS = 12;

interface TenantMetricRow {
  id: string;
  slug: string;
  name: string;
  cuit: string;
  plan: string;
  status: string;
  created_at: Date;
  active_users: bigint;
  tickets_last_30d: bigint;
  tickets_last_7d: bigint;
  tickets_total: bigint;
  tons_last_30d: number;
  last_ticket_at: Date | null;
}

function mapMetricRow(row: TenantMetricRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    cuit: row.cuit,
    plan: row.plan,
    status: row.status,
    createdAt: row.created_at,
    activeUsers: Number(row.active_users),
    ticketsLast30d: Number(row.tickets_last_30d),
    ticketsLast7d: Number(row.tickets_last_7d),
    ticketsTotal: Number(row.tickets_total),
    tonsLast30d: Number(row.tons_last_30d),
    lastTicketAt: row.last_ticket_at,
  };
}

@Injectable()
export class SuperAdminService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async getGlobalStats() {
    const rows = await prisma.$queryRaw<TenantMetricRow[]>`
      SELECT * FROM tenant_metrics
    `;

    const totalTenants = rows.length;
    const activeTenants = rows.filter((r) => r.status === 'active').length;
    const totalUsers = rows.reduce((sum, r) => sum + Number(r.active_users), 0);
    const totalTickets30d = rows.reduce((sum, r) => sum + Number(r.tickets_last_30d), 0);
    const totalTons30d = rows.reduce((sum, r) => sum + Number(r.tons_last_30d), 0);

    const planBreakdown: Record<string, number> = {};
    for (const row of rows) {
      planBreakdown[row.plan] = (planBreakdown[row.plan] ?? 0) + 1;
    }

    return {
      totalTenants,
      activeTenants,
      totalUsers,
      totalTickets30d,
      totalTons30d,
      planBreakdown,
    };
  }

  async getTenantMetrics() {
    const rows = await prisma.$queryRaw<TenantMetricRow[]>`
      SELECT * FROM tenant_metrics ORDER BY tickets_last_30d DESC
    `;
    return rows.map(mapMetricRow);
  }

  async listTenants(filters?: { status?: string; plan?: string; search?: string }) {
    const rows = await prisma.$queryRaw<TenantMetricRow[]>`
      SELECT * FROM tenant_metrics ORDER BY tickets_last_30d DESC
    `;

    let result = rows.map(mapMetricRow);

    if (filters?.status) {
      result = result.filter((r) => r.status === filters.status);
    }
    if (filters?.plan) {
      result = result.filter((r) => r.plan === filters.plan);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.slug.toLowerCase().includes(q) ||
          r.cuit.includes(q),
      );
    }

    return result;
  }

  async getTenantDetail(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);

    const rows = await prisma.$queryRaw<TenantMetricRow[]>`
      SELECT * FROM tenant_metrics WHERE id = ${tenantId}::uuid
    `;
    const metrics = rows.length > 0 ? mapMetricRow(rows[0]) : null;

    const recentTickets = await prisma.scaleTicket.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        vehicle: { select: { plate: true } },
        driver: { select: { fullName: true } },
        client: { select: { name: true } },
      },
    });

    const activeUsers = await prisma.user.findMany({
      where: { tenantId, status: 'active' },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        lastLogin: true,
        role: { select: { name: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    return { tenant, metrics, recentTickets, activeUsers };
  }

  async updateTenant(tenantId: string, dto: UpdateTenantDto) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);

    return prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.plan !== undefined && { plan: dto.plan }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.name !== undefined && { name: dto.name }),
      },
    });
  }

  async impersonateToken(tenantId: string, userId: string, issuerSuperAdminId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true, role: true },
    });
    if (!user || user.tenantId !== tenantId) {
      throw new NotFoundException('User not found in this tenant');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roleId: user.roleId ?? undefined,
      isSuperAdmin: false,
      impersonatedBy: issuerSuperAdminId,
    };

    const token = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: '1h',
    });

    return { token, expiresIn: 3600 };
  }

  async createTenant(dto: CreateTenantDto) {
    const existing = await prisma.tenant.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Tenant slug '${dto.slug}' already exists`);

    const existingCuit = await prisma.tenant.findUnique({ where: { cuit: dto.cuit } });
    if (existingCuit) throw new ConflictException(`Tenant CUIT '${dto.cuit}' already exists`);

    const existingEmail = await prisma.user.findUnique({ where: { email: dto.adminEmail } });
    if (existingEmail) throw new ConflictException(`Email '${dto.adminEmail}' already registered`);

    // Generate a temporary password
    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

    const tenant = await prisma.tenant.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        cuit: dto.cuit,
        plan: dto.plan,
        status: 'active',
      },
    });

    // Create a default admin role for this tenant
    const role = await prisma.role.create({
      data: {
        name: 'tenant_admin',
        permissions: { all: true },
        isSystem: true,
        tenantId: tenant.id,
      },
    });

    // Create admin user
    const user = await prisma.user.create({
      data: {
        email: dto.adminEmail,
        fullName: dto.adminName,
        passwordHash,
        tenantId: tenant.id,
        roleId: role.id,
        status: 'active',
      },
    });

    return {
      tenant,
      adminUser: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      temporaryPassword: tempPassword,
    };
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    return password;
  }
}
