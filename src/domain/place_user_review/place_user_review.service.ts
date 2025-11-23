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
import { ReviewablePostGroupDto } from './dto/reviewable-post-group.dto';
import { PostInfoInReviewablePlaceDto } from './dto/post-info-in-reviewable-place.dto';
import { ReviewablePlaceItemDto } from './dto/reviewable-place-item.dto';

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
  ): Promise<ReviewablePostGroupDto[]> {
    // 1. 사용자가 참여하거나 작성한 모든 Post 조회
    const participations = await this.postParticipationRepo.find({
      where: { requester: { id: userId } },
      relations: ['post'],
    });
    const participatingPostIds = participations.map((p) => p.post.id);

    const writtenPosts = await this.postRepo.find({
      where: { writer: { id: userId } },
    });
    const writtenPostIds = writtenPosts.map((p) => p.id);

    const allPostIds = [
      ...new Set([...participatingPostIds, ...writtenPostIds]),
    ];
    if (allPostIds.length === 0) return [];

    // 2. Post에 연결된 Workspace 조회
    const workspaces = await this.workspaceRepo.find({
      where: { post: { id: In(allPostIds) } },
    });
    const workspaceIds = workspaces.map((w) => w.id);
    if (workspaceIds.length === 0) return [];

    // 3. Workspace에 연결된 지난 PlanDay 조회
    const today = new Date().toISOString().split('T')[0];
    const pastPlanDays = await this.planDayRepo.find({
      where: {
        workspace: { id: In(workspaceIds) },
        planDate: LessThan(today),
      },
    });
    const pastPlanDayIds = pastPlanDays.map((pd) => pd.id);
    if (pastPlanDayIds.length === 0) return [];

    // 4. 관련 데이터 한번에 조회
    const pois = await this.poiRepo
      .createQueryBuilder('poi')
      .leftJoinAndSelect('poi.place', 'place')
      .leftJoinAndSelect('poi.planDay', 'planDay')
      .leftJoinAndSelect('planDay.workspace', 'workspace')
      .leftJoinAndSelect('workspace.post', 'post')
      .where('poi.planDay IN (:...pastPlanDayIds)', { pastPlanDayIds })
      .andWhere('poi.place IS NOT NULL')
      .andWhere('planDay.planDate IS NOT NULL')
      .getMany();

    // 5. 이미 리뷰를 작성한 Place ID 목록 조회
    const allPlaceIds = pois.map((poi) => poi.place.id);
    const reviewedPlaces = await this.placeUserReviewRepo.find({
      where: {
        user: { id: userId },
        place: { id: In(allPlaceIds) },
      },
    });
    const reviewedPlaceIds = new Set(reviewedPlaces.map((r) => r.place.id));

    // 6. Post를 기준으로 데이터 그룹핑
    const postGroups = new Map<string, ReviewablePostGroupDto>();

    for (const poi of pois) {
      if (
        !poi.place ||
        !poi.planDay?.planDate ||
        !poi.planDay.workspace?.post ||
        reviewedPlaceIds.has(poi.place.id)
      ) {
        continue;
      }

      const post = poi.planDay.workspace.post;
      let group = postGroups.get(post.id);

      if (!group) {
        group = {
          post: PostInfoInReviewablePlaceDto.fromEntity(post),
          places: [],
        };
        postGroups.set(post.id, group);
      }

      // 동일 장소가 다른 날짜에 여러번 포함된 경우, 가장 최근 날짜만 사용
      const existingPlaceIndex = group.places.findIndex(
        (p) => p.id === poi.place.id,
      );
      if (existingPlaceIndex > -1) {
        if (group.places[existingPlaceIndex].planDate < poi.planDay.planDate) {
          group.places[existingPlaceIndex].planDate = poi.planDay.planDate;
        }
      } else {
        group.places.push(
          ReviewablePlaceItemDto.from(poi.place, poi.planDay.planDate),
        );
      }
    }

    return Array.from(postGroups.values());
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
