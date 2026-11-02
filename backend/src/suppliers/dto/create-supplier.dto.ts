import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @MaxLength(140)
  name: string;

  @IsString()
  @MaxLength(120)
  contact: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsDateString()
  lastOrder?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyTotal?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
