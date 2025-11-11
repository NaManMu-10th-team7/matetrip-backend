// src/domain/review/review.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { Post } from '../post/entities/post.entity';
import { Users } from '../users/entities/users.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { Workspace } from '../workspace/entities/workspace.entity.js';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(Users)
    private readonly userRepo: Repository<Users>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
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
      relations: ['reviewer'], // 리뷰를 작성한 사용자 정보를 함께 로드합니다.
    });

    if (!reviews || reviews.length === 0) {
      return [];
    }

    return reviews;
  }
}
