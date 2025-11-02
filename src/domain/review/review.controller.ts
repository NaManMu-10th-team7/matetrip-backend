// review.controller.ts
import { Controller, Post, Body, Req /*, UseGuards*/ } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
// import { JwtAuthGuard } from '../auth/guards/jwt.guard'; // 인증이 준비되어 있다면 사용

@Controller('reviews') // 기본 경로: /reviews
export class ReviewController {
  // 서비스 주입(생성자 주입)
  constructor(private readonly service: ReviewService) {}

  // @UseGuards(JwtAuthGuard) // JWT 인증을 사용할 경우 활성화
  @Post() // POST /reviews
  async create(@Body() dto: CreateReviewDto, @Req() req: any) {
    // reviewerId는 인증이 있다면 토큰에서 추출하는 것을 권장
    // 인증이 준비되지 않았다면 임시로 body의 reviewerId를 허용할 수도 있음(지양)
    const reviewerId = req.user?.id ?? dto['reviewerId']; // 인증 도입 시 dto['reviewerId'] 제거 권장
    // 서비스에 생성 요청을 위임
    return this.service.create(dto, reviewerId);
  }
}
