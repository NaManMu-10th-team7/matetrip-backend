import {
  IsNumber,
  Max,
  Min,
  IsNotEmpty,
  IsUUID,
  IsOptional,
} from 'class-validator';

export class CreateReviewDto {
  @IsNumber({ maxDecimalPlaces: 1 }) // 소수점 1자리까지만 허용
  @Min(0) // 최솟값 0.0
  @Max(5) // 최댓값 5.0
  rating: number; // 필수: 평점

  @IsNotEmpty() // 빈 문자열 금지
  content: string; // 필수: 리뷰 본문

  @IsOptional() // 게시글 연결은 선택
  @IsUUID() // 있을 경우 UUID 형식
  postId?: string; // 옵션: 게시글 ID

  @IsUUID() // 필수: 대상 유저 UUID
  revieweeId: string; // 리뷰 대상자

  @IsUUID()
  reviewerId: string;
}
