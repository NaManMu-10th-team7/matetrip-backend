import { Module } from '@nestjs/common';
import { WorkspaceService } from './service/workspace.service';
import { WorkspaceController } from './workspace.controller';
import { Workspace } from './entities/workspace.entity.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanDay } from './entities/plan-day.entity.js';
import { PostModule } from '../post/post.module.js';
import { PoiGateway } from './poi.gateway.js';
import { PoiCacheService } from './service/poi-cache.service.js';
import { RedisModule } from '../../redis/redis.module.js';
import { Poi } from './entities/poi.entity.js';
import { PoiService } from './service/poi.service.js';
import { PlanDayService } from './service/plan-day.service.js';
import { PoiConnectionCacheService } from './service/poi-connection-cache.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workspace, PlanDay, Poi]),
    PostModule,
    RedisModule,
  ],
  controllers: [WorkspaceController],
  providers: [
    WorkspaceService,
    PoiGateway,
    PoiCacheService,
    PoiConnectionCacheService,
    PoiService,
    PlanDayService,
  ],
})
export class WorkspaceModule {}
