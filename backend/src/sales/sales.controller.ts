import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SalesService } from './sales.service';
import { IsString, Matches } from 'class-validator';
import { PlanGuard } from '../subscriptions/plan.guard';
import { RequiresPlan } from '../subscriptions/requires-plan.decorator';

class ConfirmPaymentDto {
  @IsString()
  @Matches(/^chr_(test|live)_[A-Za-z0-9]+$/)
  chargeId: string;
}

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
@RequiresPlan('basico')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @Roles(UserRole.OWNER)
  findAll(@CurrentUser() user: { businessId: string }) {
    return this.salesService.findAll(user.businessId);
  }

  @Get('report')
  @RequiresPlan('estandar')
  @Roles(UserRole.OWNER)
  findReport(@CurrentUser() user: { businessId: string }, @Query('from') from: string, @Query('to') to: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from ?? '') || !/^\d{4}-\d{2}-\d{2}$/.test(to ?? '')) {
      throw new BadRequestException('Indica un rango de fechas válido en formato AAAA-MM-DD');
    }
    const fromDate = new Date(`${from}T00:00:00Z`);
    const toDate = new Date(`${to}T00:00:00Z`);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate.toISOString().slice(0, 10) !== from || toDate.toISOString().slice(0, 10) !== to) {
      throw new BadRequestException('El rango contiene una fecha inexistente');
    }
    if (from > to) throw new BadRequestException('La fecha inicial debe ser anterior a la fecha final');
    return this.salesService.findReport(user.businessId, from, to);
  }

  @Get(':id')
  @Roles(UserRole.OWNER)
  findOne(@Param('id') id: string, @CurrentUser() user: { businessId: string }) {
    return this.salesService.findOne(id, user.businessId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.CASHIER)
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: { id: string; businessId: string }) {
    return this.salesService.create(dto, user.id, user.businessId);
  }

  @Post(':id/emit-document')
  @RequiresPlan('premium')
  @Roles(UserRole.OWNER, UserRole.CASHIER)
  emitDocument(@Param('id') id: string, @CurrentUser() user: { businessId: string }) {
    return this.salesService.emitDocument(id, user.businessId);
  }

  @Post(':id/confirm-payment')
  @Roles(UserRole.OWNER)
  confirmPayment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ConfirmPaymentDto, @CurrentUser() user: { businessId: string }) {
    return this.salesService.confirmPendingPayment(id, user.businessId, dto.chargeId);
  }

  @Post(':id/cancel-pending-payment')
  @Roles(UserRole.OWNER)
  cancelPendingPayment(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: { businessId: string }) {
    return this.salesService.cancelPendingPayment(id, user.businessId);
  }
}
