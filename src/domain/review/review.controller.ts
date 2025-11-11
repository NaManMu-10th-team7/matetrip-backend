// review.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  Req,
  Get,
  UseGuards,
  Param,
  ParseUUIDPipe /*, UseGuards*/,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { AuthGuard } from '@nestjs/passport';
// import { JwtAuthGuard } from '../auth/guards/jwt.guard'; // 인증이 준비되어 있다면 사용

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('user/:userId')
  async getReviewsForUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.reviewService.getReviewsByReceiverId(userId);
  }
}
