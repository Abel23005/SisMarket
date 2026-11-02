import { Module } from '@nestjs/common';
import { NubefactService } from './nubefact.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessProfile } from '../business/entities/business-profile.entity';
import { Sale } from '../sales/entities/sale.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, BusinessProfile])],
  providers: [NubefactService],
  exports: [NubefactService],
})
export class NubefactModule {}
