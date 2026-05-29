import { Injectable } from '@nestjs/common';
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
}
