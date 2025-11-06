import { Module } from '@nestjs/common';
import { WorkspaceService } from './service/workspace.service';
import { WorkspaceController } from './workspace.controller';
import { Workspace } from './entities/workspace.entity.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanDay } from './entities/plan-day.entity.js';
import { PostModule } from '../post/post.module.js';
import { PoiGateway } from './gateway/poi.gateway.js';
import { PoiCacheService } from './service/poi-cache.service.js';
import { RedisModule } from '../../redis/redis.module.js';
import { Poi } from './entities/poi.entity.js';
import { PoiService } from './service/poi.service.js';
import { PlanDayService } from './service/plan-day.service.js';
import { PoiConnectionCacheService } from './service/poi-connection-cache.service.js';
import { PoiConnectionService } from './service/poi-connection.service.js';
import { PoiConnection } from './entities/poi-connection.entity.js';
import { PostParticipation } from '../post-participation/entities/post-participation.entity.js';
import { ChatGateway } from './gateway/chat.gateway.js';
import { ChatMessageService } from './service/chat-message.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workspace,
      PlanDay,
      Poi,
      PoiConnection,
      PostParticipation,
    ]),
    PostModule,
    RedisModule,
  ],
  controllers: [WorkspaceController],
  providers: [
    WorkspaceService,
    PoiGateway,
    ChatGateway,
    PoiCacheService,
    PoiConnectionCacheService,
    PoiService,
    ChatMessageService,
    PlanDayService,
    PoiConnectionService,
  ],
})
export class WorkspaceModule {}
