import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisIoAdapter } from './redis-io.adapter';

@Module({
  providers: [RedisService, RedisIoAdapter],
  exports: [RedisService, RedisIoAdapter],
})
export class RedisModule {}
