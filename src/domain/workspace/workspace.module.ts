import { Module, forwardRef } from '@nestjs/common';
import { WorkspaceService } from './service/workspace.service';
import { WorkspaceController } from './workspace.controller';
import { Workspace } from './entities/workspace.entity.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanDay } from './entities/plan-day.entity.js';
import { PostModule } from '../post/post.module.js';
import { PoiGateway } from './gateway/poi.gateway.js';
import { PoiCacheService } from './service/poi-cache.service.js';
import { RedisModule } from '../../infra/redis/redis.module.js';
import { Poi } from './entities/poi.entity.js';
import { PoiService } from './service/poi.service.js';
import { PlanDayService } from './service/plan-day.service.js';
import { PoiConnection } from './entities/poi-connection.entity.js';
import { PostParticipation } from '../post-participation/entities/post-participation.entity.js';
import { ChatGateway } from './gateway/chat.gateway.js';
import { ChatMessageService } from './service/chat-message.service.js';
import { ChatMessage } from './entities/chat-message.entity.js';
import { ReviewModule } from '../review/review.module.js';
import { AiModule } from '../../ai/ai.module.js';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PlaceModule } from '../place/place.module';
import { RabbitmqModule } from '../../infra/rabbitmq/rabbitmq.module.js';
import { ChimeMeetingService } from './service/chime-meeting.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workspace,
      PlanDay,
      Poi,
      PoiConnection,
      PostParticipation,
      ChatMessage,
    ]),
    forwardRef(() => PostModule),
    RedisModule,
    ReviewModule, // ReviewService를 사용하기 위해 ReviewModule을 import
    AiModule,
    HttpModule,
    ConfigModule,
    RabbitmqModule,
    PlaceModule,
    ChimeMeetingService,
  ],
  controllers: [WorkspaceController],
  providers: [
    WorkspaceService,
    PoiGateway,
    ChatGateway,
    PoiCacheService,
    PoiService,
    ChatMessageService,
    PlanDayService,
  ],
  exports: [PoiGateway, PoiService],
})
export class WorkspaceModule {}
