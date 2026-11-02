import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PurchasesService } from './purchases.service';
import { PlanGuard } from '../subscriptions/plan.guard';
import { RequiresPlan } from '../subscriptions/requires-plan.decorator';

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
@Roles(UserRole.OWNER, UserRole.WAREHOUSE)
@RequiresPlan('estandar')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  findAll(@CurrentUser() user: { businessId: string }) {
    return this.purchasesService.findAll(user.businessId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: { businessId: string }) {
    return this.purchasesService.findOne(id, user.businessId);
  }

  @Post()
  create(
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser() user: { id: string; businessId: string },
  ) {
    return this.purchasesService.create(dto, user.id, user.businessId);
  }

  @Patch(':id/receive')
  receive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: { id: string; businessId: string }) {
    return this.purchasesService.receive(id, user.id, user.businessId);
  }

  @Patch(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: { businessId: string }) {
    return this.purchasesService.cancel(id, user.businessId);
  }
}
