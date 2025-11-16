import { Injectable, NotFoundException } from '@nestjs/common';
import { GetPlacesReqDto } from './dto/get-places-req.dto.js';
import { Place } from './entities/place.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { GetPlacesResDto as GetPlacesResDto } from './dto/get-places-res.dto.js';
import { GetPersonalizedPlacesByRegionReqDto } from './dto/get-personalized-places-by-region-req-dto.js';
import { ProfileService } from '../profile/profile.service.js';
import { RegionGroup } from './entities/region_group.enum.js';
import { GetPopularPlacesReqDto } from './dto/get-popular-places-req.dto.js';
import { GetPopularPlacesResDto } from './dto/get-popular-places-res.dto.js';
import { GetBehaviorBasedRecommendationReqDto } from './dto/get-behavior-based-recommendation-req.dto.js';
import { GetBehaviorBasedRecommendationResDto } from './dto/get-behavior-based-recommendation-res.dto.js';
import { RecommendationReasonDto } from './dto/recommendation-reason.dto.js';
import { UserBehaviorEventRepository } from '../user_behavior/user_behavior_event.repository.js';
import { GetPlaceIdWithTimeDto } from './dto/get-placeId-with-time.dto.js';

@Injectable()
export class PlaceService {
  constructor(
    @InjectRepository(Place)
    private readonly placeRepo: Repository<Place>,
    private readonly profileService: ProfileService,
    private readonly userBehaviorEventRepo: UserBehaviorEventRepository,
  ) {}

  async getPlaceById(id: string): Promise<GetPlacesResDto> {
    const place: Place | null = await this.placeRepo.findOneBy({ id });
    if (!place) {
      throw new NotFoundException(`Place not found ${id}`);
    }
    return GetPlacesResDto.from(place);
  }

  async getPlacesInBounds(dto: GetPlacesReqDto): Promise<GetPlacesResDto[]> {
    const {
      southWestLatitude,
      southWestLongitude,
      northEastLatitude,
      northEastLongitude,
    } = dto;

    const places: Place[] = await this.placeRepo.find({
      where: {
        latitude: Between(southWestLatitude, northEastLatitude),
        longitude: Between(southWestLongitude, northEastLongitude),
      },
      take: 20,
    });
    console.log('가져온 개수 = ', places.length);
    return places.map((place) => GetPlacesResDto.from(place));
  }

  async getPersonalizedPlaces(
    dto: GetPersonalizedPlacesByRegionReqDto,
  ): Promise<GetPlacesResDto[]> {
    const { userId, region } = dto;
    const embeddingValue: number[] =
      await this.profileService.getUserEmbeddingValueByUserId(userId);

    if (!embeddingValue) {
      throw new NotFoundException(`유저 embeddingValue not found ${userId}`);
    }
    const embeddingString = `[${embeddingValue.join(', ')}]`;
    const places: Place[] = await this.placeRepo
      .createQueryBuilder('p')
      .where('p.region = :region', { region })
      .orderBy('p.embedding <=> :embedding', 'ASC')
      .setParameters({ embedding: embeddingString })
      .limit(50)
      .getMany();

    return places.map((place) => GetPlacesResDto.from(place));
  }

  /**
   * 여러 사용자의 성향을 종합하여 모두가 좋아할 만한 장소를 추천합니다.
   * @param userIds - 사용자 ID 배열
   * @param region - 추천을 원하는 지역
   * @returns 추천 장소 DTO 배열
   */
  async getConsensusRecommendedPlaces(
    userIds: string[],
    region: RegionGroup,
  ): Promise<GetPlacesResDto[]> {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    // 1. 모든 참여자의 임베딩 벡터를 가져옵니다.
    const embeddings = await Promise.all(
      userIds.map((userId) =>
        this.profileService.getUserEmbeddingValueByUserId(userId),
      ),
    );

    const validEmbeddings = embeddings.filter((e) => e && e.length > 0);

    if (validEmbeddings.length === 0) {
      // TODO: 모든 사용자의 성향 데이터가 없는 경우, 인기 장소 등 대체 추천 로직을 고려할 수 있습니다.
      return [];
    }

    // 2. 임베딩 벡터의 평균을 계산하여 '종합 성향 벡터'를 생성합니다.
    const embeddingLength = validEmbeddings[0].length;
    const sumVector = new Array(embeddingLength).fill(0);

    for (const embedding of validEmbeddings) {
      for (let i = 0; i < embeddingLength; i++) {
        sumVector[i] += embedding[i];
      }
    }

    const avgVector = sumVector.map((val) => val / validEmbeddings.length);
    const avgEmbeddingString = `[${avgVector.join(',')}]`;

    // 3. 종합 성향 벡터와 코사인 유사도가 높은 장소를 50개 조회합니다.
    const places: Place[] = await this.placeRepo
      .createQueryBuilder('p')
      .where('p.region = :region', { region })
      .orderBy('p.embedding <=> :embedding', 'ASC')
      .setParameters({ embedding: avgEmbeddingString })
      .limit(50)
      .getMany();

    return places.map((place) => GetPlacesResDto.from(place));
  }

  /**
   * @description 지역 그룹 목록을 조회합니다.
   * @returns { { key: string; value: string }[] } 지역 그룹 목록
   */
  getRegionGroups(): { key: string; value: string }[] {
    return Object.entries(RegionGroup).map(([key, value]) => ({ key, value }));
  }

  /**
   * @description POI_SCHEDULE 이벤트가 많은 순서대로 장소를 조회합니다. (무한 스크롤)
   * @param dto - 페이지네이션 파라미터 (page, limit)
   * @returns GetPopularPlacesResDto[] - 인기 장소 목록
   */
  async getPopularPlaces(
    dto: GetPopularPlacesReqDto,
  ): Promise<GetPopularPlacesResDto[]> {
    const { limit, offset } = dto;

    const places = await this.placeRepo
      .createQueryBuilder('place')
      .leftJoin(
        'user_behavior_events',
        'event',
        'event.place_id = place.id AND event.event_type = :eventType',
        { eventType: 'POI_SCHEDULE' },
      )
      .select('place.id', 'id')
      .addSelect('place.title', 'title')
      .addSelect('place.address', 'address')
      .addSelect('place.image_url', 'image_url')
      .addSelect('COUNT(event.id)', 'event_count')
      .groupBy('place.id')
      .addGroupBy('place.title')
      .addGroupBy('place.address')
      .addGroupBy('place.image_url')
      .orderBy('event_count', 'DESC')
      .addOrderBy('place.created_at', 'DESC')
      .offset(offset)
      .limit(limit)
      .getRawMany<{
        id: string;
        title: string;
        address: string;
        image_url?: string;
      }>();

    return places.map((place) => GetPopularPlacesResDto.from(place));
  }

  /**
   * @description 사용자의 최근 행동 데이터를 기반으로 유사한 장소를 추천합니다.
   * @returns 추천 장소 목록 (추천 이유 포함)
   */
  async getBehaviorBasedRecommendation(
    dto: GetBehaviorBasedRecommendationReqDto,
  ): Promise<GetBehaviorBasedRecommendationResDto[]> {
    const { userId, limit = 10 } = dto;

    // 1. 최근 10일간 사용자가 관심 보인 장소들을 조회
    const interestedPlaces = await this.getRecentInterestedPlaces(userId, 10);

    if (interestedPlaces.length === 0) {
      return [];
    }

    // 2. 관심 보인 장소들과 유사한 장소 추천 (카테고리 다양성 고려)
    return await this.findSimilarPlacesWithDiversity(interestedPlaces, limit);
  }

  /**
   * 최근 N일간 사용자가 관심 보인 장소들을 조회합니다.
   * 이벤트를 기준으로 조회합니다.
   * - POI_SCHEDULE (일정에 추가)
   * - POI_MARK (마크)
   */
  private async getRecentInterestedPlaces(
    userId: string,
    recentDays: number,
  ): Promise<Place[]> {
    // 1. 최근 관심 장소의 placeId 목록 + 최신 이벤트 시간만 조회
    const placeIdsWithTime: GetPlaceIdWithTimeDto[] =
      await this.userBehaviorEventRepo.getRecentInterestedPlaceIds(
        userId,
        recentDays,
        100,
      );

    // 2. 해당 placeId들에 대한 Place 엔티티 조회 (embedding 있는 것만, 원래 순서 유지)
    return this.getPlacesByIdsInOrder(placeIdsWithTime);
  }

  /**
   * placeId 목록을 받아서 순서를 유지하면서 Place 엔티티 배열로 반환합니다.
   * embedding이 있는 장소만 반환합니다.
   */
  private async getPlacesByIdsInOrder(
    placeIdsWithTime: GetPlaceIdWithTimeDto[],
  ): Promise<Place[]> {
    if (placeIdsWithTime.length === 0) {
      return [];
    }

    const placeIds = placeIdsWithTime.map((p) => p.placeId);

    // placeIds에 해당하는 Place들을 조회 (embedding이 있는 것만)
    const places = await this.placeRepo
      .createQueryBuilder('place')
      .where('place.id IN (:...placeIds)', { placeIds })
      .andWhere('place.embedding IS NOT NULL')
      .getMany();

    // id -> Place 매핑
    const placeMap: Map<string, Place> = new Map(places.map((p) => [p.id, p]));

    // 원래 latestEventAt 순서를 유지하면서 Place 배열 구성
    return placeIdsWithTime
      .map(({ placeId }) => placeMap.get(placeId))
      .filter((p): p is Place => !!p);
  }

  /**
   * 관심 보인 장소들과 유사한 장소를 찾기
   * 카테고리 다양성을 고려하여 추천
   */
  private async findSimilarPlacesWithDiversity(
    interestedPlaces: Place[],
    limit: number,
  ): Promise<GetBehaviorBasedRecommendationResDto[]> {
    const recommendations: GetBehaviorBasedRecommendationResDto[] = [];
    const recommendedPlaceIds = new Set<string>();
    const categoryCount = new Map<string, number>();

    // 각 관심 장소에 대해 유사한 장소 찾기
    for (const interestedPlace of interestedPlaces) {
      if (recommendations.length >= limit) {
        break;
      }

      const similarPlaces = await this.findSimilarPlaces(
        interestedPlace,
        limit,
      );

      // 카테고리 다양성을 고려하여 추천 목록에 추가
      for (const similarPlace of similarPlaces) {
        if (recommendations.length >= limit) {
          break;
        }

        // 이미 추천한 장소는 제외
        if (recommendedPlaceIds.has(similarPlace.id)) {
          continue;
        }

        // 관심 보인 장소 자체는 제외
        const isInterestedPlace = interestedPlaces.some(
          (p) => p.id === similarPlace.id,
        );
        if (isInterestedPlace) {
          continue;
        }

        // 같은 카테고리가 너무 많으면 건너뛰기 (다양성 확보)
        const currentCategoryCount =
          categoryCount.get(similarPlace.category) || 0;
        if (currentCategoryCount >= Math.ceil(limit / 3)) {
          continue;
        }

        // 추천 목록에 추가
        const reason = new RecommendationReasonDto({
          id: interestedPlace.id,
          title: interestedPlace.title,
        });

        recommendations.push(
          GetBehaviorBasedRecommendationResDto.from(similarPlace, reason),
        );

        recommendedPlaceIds.add(similarPlace.id);
        categoryCount.set(similarPlace.category, currentCategoryCount + 1);
      }
    }

    return recommendations;
  }

  /**
   * 특정 장소와 임베딩 유사도가 높은 장소들을 조회합니다.
   */
  private async findSimilarPlaces(
    referencePlace: Place,
    limit: number,
  ): Promise<Place[]> {
    if (!referencePlace.embedding) {
      return [];
    }

    const embeddingString = `[${referencePlace.embedding.join(', ')}]`;

    return await this.placeRepo
      .createQueryBuilder('p')
      .orderBy('p.embedding <=> :embedding', 'ASC')
      .setParameters({ embedding: embeddingString })
      .limit(limit * 3) // 여유있게 조회 (필터링 고려)
      .getMany();
  }
}
