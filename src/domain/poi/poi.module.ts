import { Module } from '@nestjs/common';
import { PoiService } from './poi.service';
import { PoiController } from './poi.controller';

@Module({
  controllers: [PoiController],
  providers: [PoiService],
})
export class PoiModule {}
