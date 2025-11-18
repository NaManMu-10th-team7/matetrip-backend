import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlaceUserReview } from './entities/place_user_review.entity';
import { CreatePlaceUserReviewDto } from './dto/create-place_user_review.dto';
import { PlaceUserReviewResponseDto } from './dto/place-user-review-response.dto';
import { GetReviewsQueryDto } from './dto/get-reviews-query.dto';
import { PaginatedReviewsResponseDto } from './dto/paginated-reviews-response.dto';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class PlaceUserReviewService {
  constructor(
    @InjectRepository(PlaceUserReview)
    private readonly placeUserReviewRepo: Repository<PlaceUserReview>,
  ) {}

  @Transactional()
  async create(
    createDto: CreatePlaceUserReviewDto,
    userId: string,
  ): Promise<PlaceUserReviewResponseDto> {
    const alreadyExists = await this.placeUserReviewRepo.exists({
      where: {
        place: { id: createDto.placeId },
        user: { id: userId },
      },
    });

    if (alreadyExists) {
      throw new ConflictException(
        `User ${userId} has already reviewed place ${createDto.placeId}`,
      );
    }
    // TODO: 경쟁 조건 고려해서 수정
    const review = this.placeUserReviewRepo.create({
      place: { id: createDto.placeId },
      user: { id: userId },
      content: createDto.content,
      rating: createDto.rating,
    });

    const savedReview = await this.placeUserReviewRepo.save(review);

    // 저장된 리뷰를 다시 조회 - userId와 nickname만 필요
    const reviewWithUser = await this.findOneWithUser(savedReview.id);

    if (!reviewWithUser) {
      throw new NotFoundException(
        `Review ${savedReview.id} not found after creation`,
      );
    }

    return PlaceUserReviewResponseDto.fromEntity(reviewWithUser);
  }

  async findByPlaceId(
    placeId: string,
    query: GetReviewsQueryDto,
  ): Promise<PaginatedReviewsResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [reviews, total] = await this.placeUserReviewRepo.findAndCount({
      where: { place: { id: placeId } },
      relations: ['user', 'user.profile'],
      select: {
        id: true,
        content: true,
        rating: true,
        createdAt: true,
        user: {
          id: true,
          profile: {
            nickname: true,
          },
        },
      },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return this.buildPaginatedResponse(reviews, total, page, limit);
  }

  async findByUserId(
    userId: string,
    query: GetReviewsQueryDto,
  ): Promise<PaginatedReviewsResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [reviews, total] = await this.placeUserReviewRepo.findAndCount({
      where: { user: { id: userId } },
      relations: ['user', 'user.profile', 'place'],
      select: {
        id: true,
        content: true,
        rating: true,
        createdAt: true,
        user: {
          id: true,
          profile: {
            nickname: true,
          },
        },
        place: {
          id: true,
        },
      },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return this.buildPaginatedResponse(reviews, total, page, limit);
  }

  @Transactional()
  async remove(reviewId: string, userId: string): Promise<void> {
    const exists = await this.placeUserReviewRepo.exists({
      where: {
        id: reviewId,
        user: { id: userId },
      },
    });

    if (!exists) {
      throw new NotFoundException(
        '[Review 제거 실패] ReviewId가 잘못됐거나 허용되지 않는 사용자 입니다.',
      );
    }

    await this.placeUserReviewRepo.delete({ id: reviewId });
  }

  private buildPaginatedResponse(
    reviews: PlaceUserReview[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedReviewsResponseDto {
    const responseDtos = reviews.map((review) =>
      PlaceUserReviewResponseDto.fromEntity(review),
    );

    return PaginatedReviewsResponseDto.create(responseDtos, total, page, limit);
  }

  private findOneWithUser(id: string): Promise<PlaceUserReview | null> {
    return this.placeUserReviewRepo.findOne({
      where: { id },
      relations: ['user', 'user.profile'],
      select: {
        id: true,
        content: true,
        rating: true,
        createdAt: true,
        user: {
          id: true,
          profile: {
            nickname: true,
          },
        },
      },
    });
  }
}
