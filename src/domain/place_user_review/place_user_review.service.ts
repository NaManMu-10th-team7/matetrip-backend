import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlaceUserReview } from './entities/place_user_review.entity';
import { CreatePlaceUserReviewDto } from './dto/create-place_user_review.dto';
import { UpdatePlaceUserReviewDto } from './dto/update-place_user_review.dto';
import { PlaceUserReviewResponseDto } from './dto/place-user-review-response.dto';

@Injectable()
export class PlaceUserReviewService {
  constructor(
    @InjectRepository(PlaceUserReview)
    private readonly placeUserReviewRepo: Repository<PlaceUserReview>,
  ) {}

  async create(
    createDto: CreatePlaceUserReviewDto,
  ): Promise<PlaceUserReviewResponseDto> {
    // 중복 리뷰 체크 - exists 쿼리 사용
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

  async findByPlaceId(placeId: string): Promise<PlaceUserReviewResponseDto[]> {
    const reviews = await this.placeUserReviewRepo.find({
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
    });

    return reviews.map((review) =>
      PlaceUserReviewResponseDto.fromEntity(review),
    );
  }

  async findByUserId(userId: string): Promise<PlaceUserReviewResponseDto[]> {
    const reviews = await this.placeUserReviewRepo.find({
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
    });

    return reviews.map((review) =>
      PlaceUserReviewResponseDto.fromEntity(review),
    );
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
        `Review ${reviewId} not found or user ${userId} is not authorized`,
      );
    }

    await this.placeUserReviewRepo.delete({ id: reviewId });
  }
}
