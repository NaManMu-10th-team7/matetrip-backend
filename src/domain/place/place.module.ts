import { Module } from '@nestjs/common';
import { PlaceService } from './place.service';
import { PlaceController } from './place.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Place } from './entities/place.entity';
import { ProfileModule } from '../profile/profile.module';
import { UserBehaviorModule } from '../user_behavior/user_behavior.module.js';
import { ChimeMeetingService } from '../workspace/service/chime-meeting.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Place]),
    ProfileModule,
    UserBehaviorModule,
    ChimeMeetingService,
  ],
  controllers: [PlaceController],
  providers: [PlaceService],
  exports: [PlaceService],
})
export class PlaceModule {}
