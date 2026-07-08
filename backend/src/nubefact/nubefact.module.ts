import { Module } from '@nestjs/common';
import { NubefactService } from './nubefact.service';

@Module({
  providers: [NubefactService],
  exports: [NubefactService],
})
export class NubefactModule {}
