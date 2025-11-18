import { Module } from '@nestjs/common';
import { PlaceService } from './place.service';
import { PlaceController } from './place.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Place } from './entities/place.entity';
import { ProfileModule } from '../profile/profile.module';
import { UserBehaviorModule } from '../user_behavior/user_behavior.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Place]),
    ProfileModule,
    UserBehaviorModule,
  ],
  controllers: [PlaceController],
  providers: [PlaceService],
  exports: [PlaceService],
})
export class PlaceModule {}
