import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.WAREHOUSE)
  findAll() {
    return this.suppliersService.findAll();
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.WAREHOUSE)
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}
