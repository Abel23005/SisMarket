import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SetupOwnerDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]{3,80}$/)
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  businessName: string;

  @IsString()
  @MinLength(12)
  @MaxLength(100)
  password: string;
}
