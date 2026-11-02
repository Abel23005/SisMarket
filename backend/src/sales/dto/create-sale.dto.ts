import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsIn,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { PaymentMethod } from '../../common/enums/payment-method.enum';

export class SaleItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateSaleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsIn(['boleta', 'factura'])
  @IsOptional()
  documentType?: 'boleta' | 'factura';

  @ValidateIf((dto: CreateSaleDto) => dto.documentType === 'factura')
  @IsString()
  @Matches(/^\d{11}$/)
  customerDocumentNumber?: string;

  @ValidateIf((dto: CreateSaleDto) => dto.documentType === 'factura')
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  customerAddress?: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsUUID()
  cashSessionId: string;

  @ValidateIf((dto: CreateSaleDto) => dto.paymentMethod === PaymentMethod.CARD)
  @IsString()
  @Matches(/^tkn_(test|live)_[A-Za-z0-9]+$/)
  culqiToken?: string;
}
