import { Module } from '@nestjs/common';
import { PlaceUserReviewService } from './place_user_review.service';
import { PlaceUserReviewController } from './place_user_review.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaceUserReview } from './entities/place_user_review.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([PlaceUserReview])],
  controllers: [PlaceUserReviewController],
  providers: [PlaceUserReviewService],
})
export class PlaceUserReviewModule {}
