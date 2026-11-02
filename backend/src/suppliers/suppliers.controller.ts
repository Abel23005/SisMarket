import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { SuppliersService } from './suppliers.service';
import { PlanGuard } from '../subscriptions/plan.guard';
import { RequiresPlan } from '../subscriptions/requires-plan.decorator';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
@RequiresPlan('estandar')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.WAREHOUSE)
  findAll(@CurrentUser() user: { businessId: string }) {
    return this.suppliersService.findAll(user.businessId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.WAREHOUSE)
  create(@Body() dto: CreateSupplierDto, @CurrentUser() user: { businessId: string }) {
    return this.suppliersService.create(dto, user.businessId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  remove(@Param('id') id: string, @CurrentUser() user: { businessId: string }) {
    return this.suppliersService.remove(id, user.businessId);
  }
}
