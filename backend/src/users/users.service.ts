import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findById(id: string) {
    return this.usersRepository.findOne({ where: { id } });
  }

  findByUsername(username: string) {
    return this.usersRepository.findOne({ where: { username } });
  }

  findAll() {
    return this.usersRepository.find({
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

  async updateRole(id: string, role: UserRole) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
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
}
