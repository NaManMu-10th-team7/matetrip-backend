import { Module } from '@nestjs/common';
import { PlaceUserReviewService } from './place_user_review.service';
import { PlaceUserReviewController } from './place_user_review.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaceUserReview } from './entities/place_user_review.entity.js';
import { Post } from '../post/entities/post.entity.js';
import { PostParticipation } from '../post-participation/entities/post-participation.entity.js';
import { Workspace } from '../workspace/entities/workspace.entity.js';
import { PlanDay } from '../workspace/entities/plan-day.entity.js';
import { Poi } from '../workspace/entities/poi.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlaceUserReview,
      Post,
      PostParticipation,
      Workspace,
      PlanDay,
      Poi,
    ]),
  ],
  controllers: [PlaceUserReviewController],
  providers: [PlaceUserReviewService],
})
export class PlaceUserReviewModule {}
