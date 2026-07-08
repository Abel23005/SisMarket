import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { CashRegisterService } from './cash-register.service';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';

@Controller('cash-register')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @Get()
  @Roles(UserRole.OWNER)
  findAll() {
    return this.cashRegisterService.findAll();
  }

  @Get('open/current')
  @Roles(UserRole.OWNER, UserRole.CASHIER)
  findMyOpenSession(@CurrentUser() user: { id: string }) {
    return this.cashRegisterService.findOpenByCashier(user.id);
  }

  @Post('open')
  @Roles(UserRole.OWNER, UserRole.CASHIER)
  open(@Body() dto: OpenCashSessionDto, @CurrentUser() user: { id: string }) {
    return this.cashRegisterService.open(dto, user.id);
  }

  @Patch(':id/close')
  @Roles(UserRole.OWNER, UserRole.CASHIER)
  close(
    @Param('id') id: string,
    @Body() dto: CloseCashSessionDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.cashRegisterService.close(id, dto, user.id);
  }
}
