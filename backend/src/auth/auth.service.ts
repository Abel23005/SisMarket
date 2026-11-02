import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { BusinessProfile } from '../business/entities/business-profile.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { InvitationsService } from '../invitations/invitations.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { AcceptInvitationDto } from '../invitations/dto/accept-invitation.dto';
import { SetupOwnerDto } from './dto/setup-owner.dto';
import { AuthSession } from './entities/auth-session.entity';
import { AuthAuditLog } from './entities/auth-audit-log.entity';
import { SupabaseAuthService } from './supabase-auth.service';

export interface AuthRequestMetadata { ip?: string; userAgent?: string; }

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly invitationsService: InvitationsService,
    private readonly dataSource: DataSource,
    @InjectRepository(AuthSession) private readonly sessions: Repository<AuthSession>,
    @InjectRepository(AuthAuditLog) private readonly auditLogs: Repository<AuthAuditLog>,
    private readonly supabaseAuth: SupabaseAuthService,
  ) {}

  async login(dto: LoginDto, metadata: AuthRequestMetadata = {}) {
    const user = await this.usersService.findByUsername(dto.username);
    if (!user || !user.active) {
      await this.logAuthEvent({ userId: user?.id, businessId: user?.businessId, username: user?.username ?? dto.username, event: 'login', successful: false, metadata });
      throw new UnauthorizedException('Credenciales inválidas');
    }
    try {
      if (this.supabaseAuth.enabled() && user.authUserId) {
        const identity = await this.supabaseAuth.signIn(user.email, dto.password);
        if (identity.id !== user.authUserId) throw new UnauthorizedException('La identidad de Supabase no coincide con este usuario');
      } else {
        const valid = user.passwordHash ? await bcrypt.compare(dto.password, user.passwordHash) : false;
        if (!valid) throw new UnauthorizedException('Credenciales inválidas');
        if (this.supabaseAuth.enabled()) {
          const identity = await this.supabaseAuth.createUser(user.email, dto.password, { username: user.username, fullName: user.fullName });
          user.authUserId = identity.id;
          user.passwordHash = null;
          await this.dataSource.getRepository(User).save(user);
        }
      }
    } catch (error) {
      await this.logAuthEvent({ userId: user.id, businessId: user.businessId, username: user.username, event: 'login', successful: false, metadata });
      throw error;
    }
    await this.logAuthEvent({ userId: user.id, businessId: user.businessId, username: user.username, event: 'login', successful: true, metadata });
    return this.buildAuthResponse(user, metadata);
  }

  async acceptInvitation(dto: AcceptInvitationDto) {
    const invitation = await this.invitationsService.previewAccept(dto.token);
    const identity = this.supabaseAuth.enabled()
      ? await this.supabaseAuth.createUser(invitation.email, dto.password, { username: dto.username.trim(), fullName: invitation.fullName })
      : null;
    let user: User;
    try {
      user = await this.invitationsService.accept(dto, identity?.id ?? null);
    } catch (error) {
      if (identity) await this.supabaseAuth.deleteUser(identity.id);
      throw error;
    }
    return this.buildAuthResponse(user);
  }

  async setupStatus() {
    const users = await this.dataSource.getRepository(User).count();
    return { canSetupOwner: users === 0 };
  }

  async setupOwner(dto: SetupOwnerDto) {
    const identity = this.supabaseAuth.enabled()
      ? await this.supabaseAuth.createUser(dto.email.trim().toLowerCase(), dto.password, { username: dto.username.trim().toLowerCase(), fullName: dto.fullName.trim() })
      : null;
    let user: User;
    try {
      user = await this.dataSource.transaction(async (manager) => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext('sismarket-initial-owner'))");
      if (await manager.count(User)) {
        throw new ConflictException('La configuración inicial ya se completó');
      }
      const owner = await manager.save(manager.create(User, {
        username: dto.username.trim().toLowerCase(),
        email: dto.email.trim().toLowerCase(),
        fullName: dto.fullName.trim(),
        role: UserRole.OWNER,
        passwordHash: identity ? null : await bcrypt.hash(dto.password, 12),
        authUserId: identity?.id ?? null,
        active: true,
      }));
      const business = await manager.save(manager.create(BusinessProfile, {
        ownerId: owner.id,
        tradeName: dto.businessName.trim(),
      }));
      owner.businessId = business.id;
      await manager.save(owner);
      return owner;
      });
    } catch (error) {
      if (identity) await this.supabaseAuth.deleteUser(identity.id);
      throw error;
    }
    return this.buildAuthResponse(user);
  }

  async registerBusiness(dto: SetupOwnerDto) {
    const identity = this.supabaseAuth.enabled()
      ? await this.supabaseAuth.createUser(dto.email.trim().toLowerCase(), dto.password, { username: dto.username.trim().toLowerCase(), fullName: dto.fullName.trim() })
      : null;
    let user: User;
    try {
      user = await this.dataSource.transaction(async (manager) => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext('sismarket-initial-owner'))");
      const username = dto.username.trim().toLowerCase();
      if (await manager.findOne(User, { where: { username } })) {
        throw new ConflictException('Ese nombre de usuario ya está registrado');
      }
      const owner = await manager.save(manager.create(User, {
        username,
        email: dto.email.trim().toLowerCase(),
        fullName: dto.fullName.trim(),
        role: UserRole.OWNER,
        passwordHash: identity ? null : await bcrypt.hash(dto.password, 12),
        authUserId: identity?.id ?? null,
        active: true,
      }));
      const business = await manager.save(manager.create(BusinessProfile, {
        ownerId: owner.id,
        tradeName: dto.businessName.trim(),
      }));
      owner.businessId = business.id;
      await manager.save(owner);
      return owner;
      });
    } catch (error) {
      if (identity) await this.supabaseAuth.deleteUser(identity.id);
      throw error;
    }
    return this.buildAuthResponse(user);
  }

  async logout(user: { id: string; username: string; businessId: string; jti: string }, metadata: AuthRequestMetadata = {}) {
    await this.sessions.update({ jti: user.jti, userId: user.id, revokedAt: IsNull() }, { revokedAt: new Date() });
    await this.logAuthEvent({ userId: user.id, businessId: user.businessId, username: user.username, event: 'logout', successful: true, metadata });
    return { success: true };
  }

  async listAuditLogs(businessId: string) {
    return this.auditLogs.find({ where: { businessId }, order: { createdAt: 'DESC' }, take: 100 });
  }

  private async logAuthEvent(input: { userId?: string; businessId?: string | null; username: string; event: string; successful: boolean; metadata: AuthRequestMetadata }) {
    await this.auditLogs.save(this.auditLogs.create({ userId: input.userId ?? null, businessId: input.businessId ?? null,
      username: input.username.slice(0, 120), event: input.event, successful: input.successful,
      ip: input.metadata.ip ?? null, userAgent: input.metadata.userAgent?.slice(0, 1000) ?? null }));
  }

  private async buildAuthResponse(user: {
    id: string;
    username: string;
    email: string;
    fullName: string;
    role: string;
    businessId: string | null;
  }, metadata: AuthRequestMetadata = {}) {
    const jti = randomUUID();
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      businessId: user.businessId,
      jti,
    };
    const accessToken = this.jwtService.sign(payload);
    const decoded = this.jwtService.decode(accessToken) as { exp: number };
    if (user.businessId) {
      await this.sessions.save(this.sessions.create({ userId: user.id, businessId: user.businessId, jti,
        ip: metadata.ip ?? null, userAgent: metadata.userAgent?.slice(0, 1000) ?? null,
        expiresAt: new Date(decoded.exp * 1000), revokedAt: null }));
    }
    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        businessId: user.businessId,
      },
    };
  }
}
