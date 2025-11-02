import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BinaryContent } from './entities/binary-content.entity';
import { BinaryContentService } from './binary-content.service';
import { BinaryContentController } from './binary-content.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BinaryContent])],
  controllers: [BinaryContentController],
  providers: [BinaryContentService],
})
export class BinaryContentModule {}
