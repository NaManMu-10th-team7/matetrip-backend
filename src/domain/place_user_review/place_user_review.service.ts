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

@Injectable()
export class PlaceUserReviewService {
  constructor(
    @InjectRepository(PlaceUserReview)
    private readonly placeUserReviewRepo: Repository<PlaceUserReview>,
  ) {}

  async create(
    createDto: CreatePlaceUserReviewDto,
  ): Promise<PlaceUserReviewResponseDto> {
    const alreadyExists = await this.placeUserReviewRepo.exists({
      where: {
        place: { id: createDto.placeId },
        user: { id: createDto.userId },
      },
    });

    if (alreadyExists) {
      throw new ConflictException(
        `User ${createDto.userId} has already reviewed place ${createDto.placeId}`,
      );
    }

    const review = this.placeUserReviewRepo.create({
      place: { id: createDto.placeId },
      user: { id: createDto.userId },
      content: createDto.content,
      rating: createDto.rating,
    });

    const savedReview = await this.placeUserReviewRepo.save(review);

    // 저장된 리뷰를 다시 조회 - userId와 nickname만 필요
    const reviewWithUser = await this.placeUserReviewRepo.findOne({
      where: { id: savedReview.id },
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

    return PaginatedReviewsResponseDto.create(reviews, total, page, limit);
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

    return PaginatedReviewsResponseDto.create(reviews, total, page, limit);
  }

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
}
