import { IsEmail, IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

export class CreateInvitationDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName: string;

  @IsIn([UserRole.CASHIER, UserRole.WAREHOUSE])
  role: UserRole.CASHIER | UserRole.WAREHOUSE;
}
