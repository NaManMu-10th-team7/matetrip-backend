// review.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  Req /*, UseGuards*/,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
// import { JwtAuthGuard } from '../auth/guards/jwt.guard'; // 인증이 준비되어 있다면 사용

@Controller('reviews')
export class ReviewController {
  constructor(private readonly service: ReviewService) {}

  // @Post()
  // @HttpCode(201)
  // async create(@Body() dto: CreateReviewDto) {
  //   // JWT 미사용: dto.reviewerId 를 그대로 전달
  //   return this.service.create(dto);
  // }
}
