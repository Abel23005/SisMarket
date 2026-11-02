import { IsBoolean, IsIn, IsString, Matches } from 'class-validator';

export class SubscribeDto {
  @IsIn(['basico', 'estandar', 'premium'])
  planCode: 'basico' | 'estandar' | 'premium';

  @IsString()
  @Matches(/^tkn_(test|live)_[A-Za-z0-9]+$/)
  culqiToken: string;

  @IsBoolean()
  tyc: boolean;
}
