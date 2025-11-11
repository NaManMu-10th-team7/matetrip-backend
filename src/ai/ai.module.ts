import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService], // AiService를 다른 모듈에서 사용할 수 있도록 export 합니다.
})
export class AiModule {}
