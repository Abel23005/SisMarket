import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from './entities/user.entity';
import { SupabaseAuthService } from '../auth/supabase-auth.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly supabaseAuth: SupabaseAuthService,
  ) {}

  findById(id: string) {
    return this.usersRepository.findOne({ where: { id } });
  }

  findByUsername(username: string) {
    return this.usersRepository.createQueryBuilder('user')
      .addSelect(['user.passwordHash', 'user.authUserId'])
      .where('user.username = :username', { username })
      .getOne();
  }

  findAll(businessId: string) {
    return this.usersRepository.find({
      where: { businessId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        active: true,
        createdAt: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  create(data: {
    username: string;
    email: string;
    fullName: string;
    role?: UserRole;
    passwordHash: string;
  }) {
    const user = this.usersRepository.create({
      username: data.username,
      email: data.email,
      fullName: data.fullName,
      role: data.role ?? UserRole.CASHIER,
      passwordHash: data.passwordHash,
    });
    return this.usersRepository.save(user);
  }

  async updateRole(id: string, role: UserRole, actorId: string, businessId: string) {
    const user = await this.usersRepository.findOne({ where: { id, businessId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (id === actorId && role !== UserRole.OWNER) {
      throw new BadRequestException('No puedes quitarte el rol de dueño a ti mismo');
    }
    if (user.role === UserRole.OWNER && role !== UserRole.OWNER) {
      const activeOwners = await this.usersRepository.count({ where: { businessId, role: UserRole.OWNER, active: true } });
      if (user.active && activeOwners <= 1) {
        throw new BadRequestException('Debe quedar al menos un dueño activo');
      }
    }
    user.role = role;
    const saved = await this.usersRepository.save(user);
    return {
      id: saved.id,
      username: saved.username,
      email: saved.email,
      fullName: saved.fullName,
      role: saved.role,
      active: saved.active,
      createdAt: saved.createdAt,
    };
  }

  async updateStatus(id: string, active: boolean, actorId: string, businessId: string) {
    const user = await this.usersRepository.findOne({ where: { id, businessId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (id === actorId && !active) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }
    if (user.active && !active && user.role === UserRole.OWNER) {
      const activeOwners = await this.usersRepository.count({ where: { businessId, role: UserRole.OWNER, active: true } });
      if (activeOwners <= 1) throw new BadRequestException('Debe quedar al menos un dueño activo');
    }
    user.active = active;
    const saved = await this.usersRepository.save(user);
    return {
      id: saved.id,
      username: saved.username,
      email: saved.email,
      fullName: saved.fullName,
      role: saved.role,
      active: saved.active,
      createdAt: saved.createdAt,
    };
  }

  async resetPassword(id: string, password: string, businessId: string) {
    const user = await this.usersRepository.createQueryBuilder('user')
      .addSelect('user.authUserId')
      .where('user.id = :id AND user.businessId = :businessId', { id, businessId })
      .getOne();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.authUserId) {
      if (!this.supabaseAuth.enabled()) throw new ServiceUnavailableException('Activa Supabase Auth para restablecer la contraseña de esta cuenta');
      await this.supabaseAuth.updateUserPassword(user.authUserId, password);
    } else {
      user.passwordHash = await bcrypt.hash(password, 12);
      await this.usersRepository.save(user);
    }
    return { id: user.id, updated: true };
  }
}
