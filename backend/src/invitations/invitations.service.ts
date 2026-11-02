import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { TeamInvitation } from './entities/team-invitation.entity';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(TeamInvitation)
    private readonly invitations: Repository<TeamInvitation>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  findAll(businessId: string) {
    return this.invitations.find({
      where: { businessId },
      select: { id: true, email: true, fullName: true, role: true, status: true, expiresAt: true, createdAt: true },
      order: { createdAt: 'DESC' },
    });
  }

  async create(dto: CreateInvitationDto, createdBy: string, businessId: string) {
    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.users.findOne({ where: { email, businessId } });
    if (existingUser) throw new ConflictException('Ya existe un usuario con ese correo');
    const pending = await this.invitations.findOne({ where: { email, businessId, status: 'pending' } });
    if (pending && pending.expiresAt > new Date()) {
      throw new ConflictException('Ya existe una invitación vigente para ese correo');
    }

    const token = randomBytes(32).toString('hex');
    const invitation = await this.invitations.save(this.invitations.create({
      email,
      fullName: dto.fullName.trim(),
      role: dto.role,
      tokenHash: this.hashToken(token),
      status: 'pending',
      createdBy,
      businessId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      acceptedAt: null,
    }));
    const baseUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173').replace(/\/$/, '');
    return {
      id: invitation.id,
      email: invitation.email,
      fullName: invitation.fullName,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      invitationUrl: `${baseUrl}/accept-invitation?token=${token}`,
    };
  }

  async revoke(id: string, businessId: string) {
    const invitation = await this.invitations.findOne({ where: { id, businessId, status: 'pending' } });
    if (!invitation) throw new NotFoundException('Invitación pendiente no encontrada');
    invitation.status = 'revoked';
    await this.invitations.save(invitation);
    return { id, status: invitation.status };
  }

  async accept(dto: AcceptInvitationDto, authUserId: string | null = null) {
    return this.dataSource.transaction(async (manager) => {
      const tokenHash = this.hashToken(dto.token);
      const invitation = await manager.findOne(TeamInvitation, {
        where: { tokenHash, status: 'pending' },
        lock: { mode: 'pessimistic_write' },
      });
      if (!invitation) throw new NotFoundException('La invitación no existe o ya fue utilizada');
      if (invitation.expiresAt <= new Date()) {
        throw new BadRequestException('La invitación venció; solicita una nueva al dueño');
      }
      const username = dto.username.trim();
      const duplicate = await manager.findOne(User, {
        where: [{ username }, { email: invitation.email, businessId: invitation.businessId ?? undefined }],
      });
      if (duplicate) throw new ConflictException('El nombre de usuario o el correo ya está registrado');
      const user = await manager.save(manager.create(User, {
        username,
        email: invitation.email,
        fullName: invitation.fullName,
        role: invitation.role,
        businessId: invitation.businessId,
        passwordHash: authUserId ? null : await bcrypt.hash(dto.password, 12),
        authUserId,
        active: true,
      }));
      invitation.status = 'accepted';
      invitation.acceptedAt = new Date();
      await manager.save(invitation);
      return user;
    });
  }

  async previewAccept(token: string) {
    const invitation = await this.invitations.findOne({ where: { tokenHash: this.hashToken(token), status: 'pending' } });
    if (!invitation) throw new NotFoundException('La invitación no existe o ya fue utilizada');
    if (invitation.expiresAt <= new Date()) throw new BadRequestException('La invitación venció; solicita una nueva al dueño');
    return { email: invitation.email, fullName: invitation.fullName };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
