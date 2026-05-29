import { IsNumber, Min } from 'class-validator';

export class OpenCashSessionDto {
  @IsNumber()
  @Min(0)
  openingAmount: number;
}
