import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByUsername(dto.username);
    if (!user || !user.active) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.buildAuthResponse(user);
  }

  async register(dto: RegisterDto) {
    const username = dto.username.trim();
    const existing = await this.usersService.findByUsername(username);
    if (existing) {
      throw new ConflictException('El usuario ya existe');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      username,
      email: dto.email.trim().toLowerCase(),
      fullName: dto.fullName.trim(),
      role: dto.role,
      passwordHash,
    });
    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: {
    id: string;
    username: string;
    email: string;
    fullName: string;
    role: string;
  }) {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }
}
