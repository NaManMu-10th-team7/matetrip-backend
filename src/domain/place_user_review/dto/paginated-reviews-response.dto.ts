import { PlaceUserReviewResponseDto } from './place-user-review-response.dto';

export class PaginatedReviewsResponseDto {
  data: PlaceUserReviewResponseDto[];
  total: number; // 전체 리뷰 개수
  page: number; // 현재 페이지
  limit: number; // 페이지당 개수
  totalPages: number; // 전체 페이지 수

  private constructor() {}

  static create(
    reviewDtos: PlaceUserReviewResponseDto[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedReviewsResponseDto {
    if (limit <= 0) {
      throw new Error('limit must be greater than 0');
    }
    if (total < 0 || page < 1) {
      throw new Error('total must be non-negative and page must be at least 1');
    }
    const dto = new PaginatedReviewsResponseDto();
    dto.data = reviewDtos;
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}
