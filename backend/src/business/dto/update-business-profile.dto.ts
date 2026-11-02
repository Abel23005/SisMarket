import {
  IsEmail,
  IsOptional,
  IsString,
  IsBoolean,
  Matches,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';

export class UpdateBusinessProfileDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/)
  taxId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  legalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  tradeName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  taxAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  legalRepresentative?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{8}$/)
  representativeDni?: string;

  @IsOptional()
  @IsString()
  @Matches(/^F\d{3}$/)
  invoiceSeries?: string;

  @IsOptional()
  @IsString()
  @Matches(/^B\d{3}$/)
  receiptSeries?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  nextInvoiceNumber?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  nextReceiptNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  nubefactToken?: string | null;

  @IsOptional()
  @IsBoolean()
  clearNubefactToken?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^pk_(test|live)_[A-Za-z0-9]+$/)
  culqiPublicKey?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^sk_(test|live)_[A-Za-z0-9]+$/)
  culqiSecretKey?: string | null;

  @IsOptional()
  @IsBoolean()
  clearCulqiSecretKey?: boolean;
}
