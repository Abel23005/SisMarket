import { IsNotEmpty, IsString, Matches, MinLength, MaxLength } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i)
  token: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9._-]{3,80}$/)
  username: string;

  @IsString()
  @MinLength(10)
  @MaxLength(100)
  password: string;
}
