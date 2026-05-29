import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  imports: [
    NestCacheModule.register({
      ttl: 60_000,
      max: 200,
    }),
  ],
  exports: [NestCacheModule],
})
export class AppCacheModule {}
