import { Module } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { WorkspaceController } from './workspace.controller';
import { Workspace } from './entities/workspace.entity.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanDay } from './entities/plan-day.entity.js';
import { PostModule } from '../post/post.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Workspace, PlanDay]), PostModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceService],
})
export class WorkspaceModule {}
