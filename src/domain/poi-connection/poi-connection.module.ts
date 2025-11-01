import { Module } from '@nestjs/common';
import { PoiConnectionService } from './poi-connection.service';
import { PoiConnectionController } from './poi-connection.controller';

@Module({
  controllers: [PoiConnectionController],
  providers: [PoiConnectionService],
})
export class PoiConnectionModule {}
