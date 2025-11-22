import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, LessThan } from 'typeorm';
import { PlaceUserReview } from './entities/place_user_review.entity';
import { CreatePlaceUserReviewDto } from './dto/create-place_user_review.dto';
import { PlaceUserReviewResponseDto } from './dto/place-user-review-response.dto';
import { GetReviewsQueryDto } from './dto/get-reviews-query.dto';
import { PaginatedReviewsResponseDto } from './dto/paginated-reviews-response.dto';
import { Transactional } from 'typeorm-transactional';
import { Post } from '../post/entities/post.entity';
import { PostParticipation } from '../post-participation/entities/post-participation.entity';
import { Workspace } from '../workspace/entities/workspace.entity';
import { PlanDay } from '../workspace/entities/plan-day.entity';
import { Poi } from '../workspace/entities/poi.entity';
import { Place } from '../place/entities/place.entity';
import { ReviewablePlaceResponseDto } from './dto/reviewable-place-response.dto';

@Injectable()
export class PlaceUserReviewService {
  constructor(
    @InjectRepository(PlaceUserReview)
    private readonly placeUserReviewRepo: Repository<PlaceUserReview>,
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(PostParticipation)
    private readonly postParticipationRepo: Repository<PostParticipation>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(PlanDay)
    private readonly planDayRepo: Repository<PlanDay>,
    @InjectRepository(Poi)
    private readonly poiRepo: Repository<Poi>,
  ) {}

  async findReviewablePlaces(
    userId: string,
  ): Promise<ReviewablePlaceResponseDto[]> {
    // 1. 사용자가 참여한 Post 조회
    const participations = await this.postParticipationRepo.find({
      where: { requester: { id: userId } },
      relations: ['post'],
    });
    const participatingPostIds = participations.map((p) => p.post.id);

    // 2. 사용자가 작성한 Post 조회
    const writtenPosts = await this.postRepo.find({
      where: { writer: { id: userId } },
    });
    const writtenPostIds = writtenPosts.map((p) => p.id);

    const allPostIds = [
      ...new Set([...participatingPostIds, ...writtenPostIds]),
    ];

    if (allPostIds.length === 0) {
      return [];
    }

    // 3. Post에 연결된 Workspace 조회
    const workspaces = await this.workspaceRepo.find({
      where: { post: { id: In(allPostIds) } },
    });
    const workspaceIds = workspaces.map((w) => w.id);

    if (workspaceIds.length === 0) {
      return [];
    }

    // 4. Workspace에 연결된 지난 PlanDay 조회
    const today = new Date().toISOString().split('T')[0];
    const pastPlanDays = await this.planDayRepo.find({
      where: {
        workspace: { id: In(workspaceIds) },
        planDate: LessThan(today),
      },
    });
    const pastPlanDayIds = pastPlanDays.map((pd) => pd.id);

    if (pastPlanDayIds.length === 0) {
      return [];
    }

    // 5. PlanDay에 연결된 Poi(Place) 조회
    const pois = await this.poiRepo.find({
      where: { planDay: { id: In(pastPlanDayIds) } },
      relations: ['place'],
    });
    const places = pois.map((poi) => poi.place).filter((p) => p); // null인 경우 제외

    if (places.length === 0) {
      return [];
    }
    const placeIds = places.map((p) => p.id);

    // 6. 이미 리뷰를 작성한 Place 제외
    const reviewedPlaces = await this.placeUserReviewRepo.find({
      where: {
        user: { id: userId },
        place: { id: In(placeIds) },
      },
      relations: ['place'],
    });
    const reviewedPlaceIds = reviewedPlaces.map((r) => r.place.id);

    const reviewablePlaces = places.filter(
      (p) => !reviewedPlaceIds.includes(p.id),
    );

    return reviewablePlaces.map((p) => ReviewablePlaceResponseDto.fromEntity(p));
  }

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
