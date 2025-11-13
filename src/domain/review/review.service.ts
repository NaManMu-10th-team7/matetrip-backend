// src/domain/review/review.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { Workspace } from '../workspace/entities/workspace.entity.js';
import { Profile } from '../profile/entities/profile.entity';
import { UpdateReviewDto } from './dto/update-review.dto';

const DEFAULT_MANNER_TEMPERATURE = 36.5;
const MANNER_TEMPERATURE_MIN = 0;
const MANNER_TEMPERATURE_MAX = 100;
const RATING_TO_DELTA: Record<number, number> = {
  1: -0.5,
  2: -0.2,
  3: 0.1,
  4: 0.3,
  5: 0.5,
};

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
    private readonly ds: DataSource,
  ) {}

  async create(
    dtos: CreateReviewDto[],
    workspaceId: string,
    reviewerId: string,
  ): Promise<{ count: number; ids: string[] }> {
    return this.ds.transaction(async (transactionalEntityManager) => {
      const workspace = await transactionalEntityManager.findOne(Workspace, {
        where: { id: workspaceId },
        relations: ['post', 'post.writer'],
      });

      if (!workspace) {
        throw new NotFoundException(
          `Workspace with ID "${workspaceId}" not found.`,
        );
      }

      if (!workspace.post) {
        throw new NotFoundException(
          `Workspace with ID "${workspaceId}" has no associated post.`,
        );
      }

      const postId = workspace.post.id;

      // 중복 리뷰 검사
      await Promise.all(
        dtos.map(async (dto) => {
          const existingReview = await transactionalEntityManager.findOne(
            Review,
            {
              where: {
                post: { id: postId },
                reviewer: { id: reviewerId },
                reviewee: { id: dto.revieweeId },
              },
            },
          );

          if (existingReview) {
            throw new ConflictException(
              `Review for user ${dto.revieweeId} by ${reviewerId} on post ${postId} already exists.`,
            );
          }
        }),
      );

      // DTO 배열을 Review 엔티티 배열로 변환
      const reviewsToCreate = dtos.map((dto) => {
        // 리뷰 작성자(reviewer)는 현재 로그인한 사용자
        // 리뷰 대상자(reviewee)는 dto에 포함된 userId
        return this.reviewRepo.create({
          ...dto,
          post: { id: postId },
          reviewer: { id: reviewerId },
          reviewee: { id: dto.revieweeId }, // 리뷰 대상자 설정
        });
      });

      try {
        const savedReviews =
          await transactionalEntityManager.save(reviewsToCreate);

        await Promise.all(
          savedReviews.map((review) => {
            const revieweeId = review.reviewee?.id;
            if (!revieweeId) {
              throw new BadRequestException(
                'Reviewee information is missing while applying manner temperature.',
              );
            }
            const delta = this.calculateDelta(review.rating);
            return this.applyMannerTemperatureDelta(
              transactionalEntityManager,
              revieweeId,
              delta,
            );
          }),
        );

        return {
          count: savedReviews.length,
          ids: savedReviews.map((r) => r.id),
        };
      } catch (error) {
        throw new BadRequestException(
          'Failed to create reviews.',
          error.message,
        );
      }
    });
  }

  async getReviewsByReceiverId(userId: string): Promise<Review[]> {
    const reviews = await this.reviewRepo.find({
      where: { reviewee: { id: userId } },
      relations: ['reviewer', 'reviewer.profile'], // 리뷰를 작성한 사용자 정보를 함께 로드합니다.
    });

    if (!reviews || reviews.length === 0) {
      return [];
    }

    return reviews;
  }

  async update(
    reviewId: string,
    reviewerId: string,
    dto: UpdateReviewDto,
  ): Promise<Review> {
    return this.ds.transaction(async (manager) => {
      const review = await manager.findOne(Review, {
        where: { id: reviewId },
        relations: ['reviewee', 'reviewer'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!review) {
        throw new NotFoundException(`Review ${reviewId} not found.`);
      }

      if (review.reviewer.id !== reviewerId) {
        throw new ForbiddenException(
          `User ${reviewerId} cannot update review ${reviewId}.`,
        );
      }

      const prevDelta = this.calculateDelta(review.rating);
      const nextDelta = this.calculateDelta(dto.rating);
      const deltaDiff = nextDelta - prevDelta;

      review.rating = dto.rating;
      if (dto.content !== undefined) {
        review.content = dto.content;
      }

      const updatedReview = await manager.save(review);

      if (deltaDiff !== 0) {
        await this.applyMannerTemperatureDelta(
          manager,
          review.reviewee.id,
          deltaDiff,
        );
      }

      return updatedReview;
    });
  }

  private calculateDelta(rating: number): number {
    const normalizedRating = Number(rating.toFixed(1));
    const delta = RATING_TO_DELTA[normalizedRating];
    if (delta === undefined) {
      throw new BadRequestException(
        `Unsupported rating "${rating}". Allowed ratings: ${Object.keys(RATING_TO_DELTA).join(', ')}`,
      );
    }
    return delta;
  }

  private clampMannerTemperature(value: number): number {
    return Math.min(
      MANNER_TEMPERATURE_MAX,
      Math.max(MANNER_TEMPERATURE_MIN, value),
    );
  }

  private async applyMannerTemperatureDelta(
    manager: EntityManager | null,
    userId: string,
    delta: number,
  ): Promise<void> {
    if (delta === 0) {
      return;
    }

    const profileRepository = manager
      ? manager.getRepository(Profile)
      : this.profileRepo;

    const profile = await profileRepository.findOne({
      where: { user: { id: userId } },
      ...(manager ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });

    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found.`);
    }

    const currentTemperature = this.toNumberOrDefault(
      profile.mannerTemperature,
    );
    profile.mannerTemperature = this.clampMannerTemperature(
      currentTemperature + delta,
    );

    await profileRepository.save(profile);
  }

  private toNumberOrDefault(value: number | string | null | undefined): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return DEFAULT_MANNER_TEMPERATURE;
  }
}
