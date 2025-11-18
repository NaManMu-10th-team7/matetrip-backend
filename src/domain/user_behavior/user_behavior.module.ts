import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserBehaviorService } from './user_behavior.service.js';
import { UserBehaviorEvent } from './entities/user_behavior_event.entity.js';
import { UserBehaviorEventRepository } from './user_behavior_event.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserBehaviorEvent])],
  controllers: [],
  providers: [UserBehaviorService, UserBehaviorEventRepository],
  exports: [UserBehaviorEventRepository],
})
export class UserBehaviorModule {}
