import { Module } from '@nestjs/common';
import { ProxyController } from './proxy.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule], // ProxyController에서 HttpService를 사용하므로 HttpModule을 import합니다.
  controllers: [ProxyController],
})
export class ProxyModule {}
