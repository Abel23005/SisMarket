import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';
import { PlanGuard } from '../subscriptions/plan.guard';
import { RequiresPlan } from '../subscriptions/requires-plan.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
@RequiresPlan('basico')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@CurrentUser() user: { businessId: string }) {
    return this.productsService.findAll(user.businessId);
  }

  @Get('low-stock')
  @Roles(UserRole.OWNER, UserRole.WAREHOUSE)
  findLowStock(@CurrentUser() user: { businessId: string }) {
    return this.productsService.findLowStock(user.businessId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { businessId: string }) {
    return this.productsService.findOne(id, user.businessId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.WAREHOUSE)
  create(@Body() dto: CreateProductDto, @CurrentUser() user: { id: string; businessId: string }) {
    return this.productsService.create(dto, user.id, user.businessId);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.WAREHOUSE)
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: { id: string; businessId: string }) {
    return this.productsService.update(id, dto, user.id, user.businessId);
  }

  @Get(':id/movements')
  @Roles(UserRole.OWNER, UserRole.WAREHOUSE)
  findMovements(@Param('id') id: string, @CurrentUser() user: { businessId: string }) {
    return this.productsService.findMovements(id, user.businessId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  remove(@Param('id') id: string, @CurrentUser() user: { businessId: string }) {
    return this.productsService.remove(id, user.businessId);
  }
}
