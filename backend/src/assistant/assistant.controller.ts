import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { AssistantService } from './assistant.service';
import { AssistantChatDto } from './dto/assistant-chat.dto';
import { PlanGuard } from '../subscriptions/plan.guard';
import { RequiresPlan } from '../subscriptions/requires-plan.decorator';

@Controller('assistant')
@UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
@RequiresPlan('premium')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('chat')
  @Roles(UserRole.OWNER)
  chat(@Body() dto: AssistantChatDto, @CurrentUser() user: { businessId: string }) {
    return this.assistantService.chat(dto.message, user.businessId);
  }
}
