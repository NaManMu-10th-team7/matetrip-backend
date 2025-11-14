import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { UpdateReviewDto } from './dto/update-review.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('user/:userId')
  async getReviewsForUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.reviewService.getReviewsByReceiverId(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':reviewId')
  async updateReview(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() dto: UpdateReviewDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.reviewService.update(reviewId, req.user.id, dto);
  }
}
