import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { UpdateBusinessProfileDto } from './dto/update-business-profile.dto';
import { BusinessService } from './business.service';

@Controller('business-profile')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER)
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get()
  findMine(@CurrentUser() user: { businessId: string }) {
    return this.businessService.findMine(user.businessId);
  }

  @Patch()
  update(
    @Body() dto: UpdateBusinessProfileDto,
    @CurrentUser() user: { businessId: string },
  ) {
    return this.businessService.update(user.businessId, dto);
  }
}
