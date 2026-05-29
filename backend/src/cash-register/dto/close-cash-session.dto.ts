import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseCashSessionDto {
  @IsNumber()
  @Min(0)
  closingAmount: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
