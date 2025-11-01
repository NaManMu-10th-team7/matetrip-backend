import { Module } from '@nestjs/common';
import { BinaryContentService } from './binary-content.service';
import { BinaryContentController } from './binary-content.controller';

@Module({
  controllers: [BinaryContentController],
  providers: [BinaryContentService],
})
export class BinaryContentModule {}
