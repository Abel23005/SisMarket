import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AuthSession } from '../entities/auth-session.entity';
import { TenantContextService } from '../../database/tenant-context.service';

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  jti: string;
  businessId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
    @InjectRepository(AuthSession) private readonly sessions: Repository<AuthSession>,
    private readonly tenantContext: TenantContextService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.jti) throw new UnauthorizedException('Sesión no válida');
    return this.tenantContext.run({ userId: payload.sub, businessId: payload.businessId, role: payload.role, jti: payload.jti }, async () => {
      const session = await this.sessions.findOne({ where: { jti: payload.jti, userId: payload.sub, revokedAt: IsNull() } });
      if (!session || session.expiresAt <= new Date()) throw new UnauthorizedException('Sesión vencida o cerrada');
      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.active || !user.businessId || user.businessId !== session.businessId) {
        throw new UnauthorizedException('Usuario no autorizado');
      }
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        businessId: user.businessId,
        jti: payload.jti,
      };
    });
  }
}
