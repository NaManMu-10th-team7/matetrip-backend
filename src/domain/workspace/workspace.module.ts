import { Module } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { WorkspaceController } from './workspace.controller';
import { Workspace } from './entities/workspace.entity.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanDay } from './entities/plan-day.entity.js';
import { PostModule } from '../post/post.module.js';
import { PoiGateway } from './poi.gateway.js';
import { PoiCacheService } from './poi-cache.service.js';
import { RedisModule } from '../../redis/redis.module.js';
import { Poi } from './entities/poi.entity.js';
import { PoiService } from './poi.service.js';
import { PlanDayService } from './plan-day.service.js';

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
    PoiService,
    PlanDayService,
  ],
})
export class WorkspaceModule {}
