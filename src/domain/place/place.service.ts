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
import { GetMostReviewedPlacesReqDto } from './dto/get-most-reviewed-places-req.dto.js';
import { GetMostReviewedPlacesResDto } from './dto/get-most-reviewed-places-res.dto.js';
import { SearchPlaceByNameQueryDto } from './dto/search-place-by-name-query.dto.js';

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

  /**
   * @description 장소 이름으로 장소를 검색하여 ID 목록을 반환합니다. (부분 일치, 대소문자 무시)
   * @param dto - 검색할 장소 이름이 담긴 DTO
   * @returns { placeIds: string[] } - 검색된 장소의 ID 목록을 담은 객체
   */
  async findPlacesByName(
    dto: SearchPlaceByNameQueryDto,
  ): Promise<{ placeIds: string[] }> {
    const { name } = dto;
    const results = await this.placeRepo
      .createQueryBuilder('place')
      .select('place.id', 'id') // ID만 선택
      .where('place.title ILIKE :name', { name: `%${name}%` }) // 부분 일치 검색
      .orderBy(
        `CASE
          WHEN place.title = :exactName THEN 1
          WHEN place.title ILIKE :startsWithName THEN 2
          ELSE 3
        END`,
      )
      .addOrderBy('place.title', 'ASC') // 2차 정렬: 이름순
      .setParameters({
        name: `%${name}%`,
        exactName: name,
        startsWithName: `${name}%`,
      })
      .take(5) // 너무 많은 결과를 방지하기 위해 5개로 제한
      .getRawMany<{ id: string }>();

    return { placeIds: results.map((result) => result.id) };
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
   * @description 여러 사용자의 성향을 종합하여 모두가 좋아할 만한 숙소를 추천합니다.
   * @param userIds - 사용자 ID 배열
   * @param region - 추천을 원하는 지역
   * @param limit - 추천받을 숙소 개수
   * @returns 추천 숙소 DTO 배열
   */
  async getConsensusRecommendedAccommodations(
    avgVector: number[],
    region: RegionGroup,
    limit: number,
  ): Promise<GetPlacesResDto[]> {
    if (!avgVector) {
      return [];
    }

    const avgEmbeddingString = `[${avgVector.join(',')}]`;

    const places: Place[] = await this.placeRepo
      .createQueryBuilder('p')
      .where('p.region = :region', { region })
      .andWhere("p.category = '숙박'")
      .orderBy('p.embedding <=> :embedding', 'ASC')
      .setParameters({ embedding: avgEmbeddingString })
      .limit(limit)
      .getMany();

    return places.map((place) => GetPlacesResDto.from(place));
  }

  /**
   * @description 여러 사용자의 ID를 기반으로 종합 성향 벡터를 계산합니다.
   * @param userIds - 사용자 ID 배열
   * @returns 종합 성향 벡터 또는 null
   */
  async calculateConsensusVector(userIds: string[]): Promise<number[] | null> {
    if (!userIds || userIds.length === 0) {
      return null;
    }

    const embeddings = await Promise.all(
      userIds.map((userId) =>
        this.profileService.getUserEmbeddingValueByUserId(userId),
      ),
    );

    const validEmbeddings = embeddings.filter((e) => e && e.length > 0);

    if (validEmbeddings.length === 0) {
      return null;
    }

    return this.calculateAverageEmbeddingFromVectors(validEmbeddings);
  }

  /**
   * @description 종합 성향 벡터를 기반으로 여러 카테고리의 장소를 추천합니다.
   * @param avgVector - 종합 성향 벡터
   * @param region - 지역
   * @param categories - 추천받을 카테고리 맵 (e.g. { '관광지': 2, '음식점': 2 })
   * @param excludeIds - 추천에서 제외할 장소 ID 목록
   * @param centerLat - 중심 위도 (숙소)
   * @param centerLon - 중심 경도 (숙소)
   * @param radius - 검색 반경 (km)
   * @returns 카테고리별 추천 장소 목록
   */
  async getConsensusRecommendedPlacesForCategories(
    avgVector: number[],
    region: RegionGroup,
    categories: Map<string, number>,
    excludeIds: string[],
    centerLat: number,
    centerLon: number,
  ): Promise<GetPlacesResDto[]> {
    if (!avgVector || avgVector.length === 0) {
      return [];
    }
    const avgEmbeddingString = `[${avgVector.join(',')}]`;
    const categoryNames = Array.from(categories.keys());
    const totalLimit = Array.from(categories.values()).reduce(
      (sum, count) => sum + count,
      0,
    );

    const queryBuilder = this.placeRepo
      .createQueryBuilder('p')
      .where('p.region = :region', { region })
      .andWhere('p.category IN (:...categories)', { categories: categoryNames })
      // 10km 반경 필터 추가 (Haversine formula)
      .andWhere(
        `( 6371 * acos( cos( radians(:centerLat) ) * cos( radians( p.latitude ) ) * cos( radians( p.longitude ) - radians(:centerLon) ) + sin( radians(:centerLat) ) * sin( radians( p.latitude ) ) ) ) < :radius`,
      )
      // 1순위: 성향 유사도, 2순위: 거리 순으로 정렬
      .orderBy('p.embedding <=> :embedding', 'ASC')
      .addOrderBy(
        `( 6371 * acos( cos( radians(:centerLat) ) * cos( radians( p.latitude ) ) * cos( radians( p.longitude ) - radians(:centerLon) ) + sin( radians(:centerLat) ) * sin( radians( p.latitude ) ) ) )`,
        'ASC',
      )
      .setParameters({
        embedding: avgEmbeddingString,
        centerLat,
        centerLon,
        radius: 5, // 검색 반경 5km로 설정
      })
      // 필터링을 위해 넉넉하게 조회 (예: 50개)
      .limit(100);

    if (excludeIds.length > 0) {
      queryBuilder.andWhere('p.id NOT IN (:...excludeIds)', { excludeIds });
    }

    const candidatePlaces = await queryBuilder.getMany();

    // 각 카테고리별로 필요한 개수만큼 필터링
    const result: Place[] = this.filterPlacesByCategories(
      candidatePlaces,
      categories,
    );
    return result.map((place) => GetPlacesResDto.from(place));
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
    const avgVector =
      this.calculateAverageEmbeddingFromVectors(validEmbeddings);

    if (!avgVector) {
      return [];
    }

    const avgEmbeddingString = `[${avgVector.join(',')}]`;

    // 3. 종합 성향 벡터와 코사인 유사도가 높은 장소를 50개 조회합니다.
    const places: Place[] = await this.placeRepo
      .createQueryBuilder('p')
      .where('p.region = :region', { region })
      .orderBy('p.embedding <=> :embedding', 'ASC')
      .setParameters({ embedding: avgEmbeddingString })
      .limit(50)
      .getMany();

    console.log(places);

    return places.map((place) => GetPlacesResDto.from(place));
  }

  private filterPlacesByCategories(
    places: Place[],
    categories: Map<string, number>,
  ): Place[] {
    const result: Place[] = [];
    const categoryCount = new Map<string, number>();

    for (const place of places) {
      const requiredCount = categories.get(place.category);
      if (!requiredCount) continue;

      const currentCount = categoryCount.get(place.category) || 0;
      if (currentCount < requiredCount) {
        result.push(place);
        categoryCount.set(place.category, currentCount + 1);
      }
    }

    // 모든 카테고리가 채워졌는지 확인 (선택사항, 더 빠른 종료를 위해)
    const allFilled = Array.from(categories.entries()).every(
      ([cat, count]) => (categoryCount.get(cat) || 0) >= count,
    );
    if (allFilled) return result;

    return result;
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
   * @description 리뷰가 많은 순서대로 장소를 조회합니다. (무한 스크롤)
   * @param dto - 페이지네이션 파라미터 (limit, offset)
   * @returns GetMostReviewedPlacesResDto[] - 리뷰가 많은 장소 목록 (평균 rating 포함)
   */
  async getMostReviewedPlaces(
    dto: GetMostReviewedPlacesReqDto,
  ): Promise<GetMostReviewedPlacesResDto[]> {
    const { limit, offset } = dto;

    const places = await this.placeRepo
      .createQueryBuilder('place')
      .leftJoin('place_user_review', 'review', 'review.place_id = place.id')
      .select('place.id', 'id')
      .addSelect('place.title', 'title')
      .addSelect('place.address', 'address')
      .addSelect('place.image_url', 'image_url')
      .addSelect('place.category', 'category')
      .addSelect('COUNT(review.id)', 'review_count')
      .addSelect('AVG(review.rating)', 'average_rating')
      .groupBy('place.id')
      .addGroupBy('place.title')
      .addGroupBy('place.address')
      .addGroupBy('place.image_url')
      .addGroupBy('place.category')
      .orderBy('review_count', 'DESC')
      .addOrderBy('average_rating', 'DESC')
      .addOrderBy('place.created_at', 'DESC')
      .offset(offset)
      .limit(limit)
      .getRawMany<{
        id: string;
        title: string;
        address: string;
        image_url?: string;
        category: string;
        review_count: string;
        average_rating: string | null;
      }>();

    return places.map((place) => GetMostReviewedPlacesResDto.from(place));
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
    const interestedPlaces: Place[] = await this.getRecentInterestedPlaces(
      userId,
      10,
    );

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
        10,
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
   *
   * 관심 장소들의 평균 임베딩을 계산하여 한 번의 쿼리로 유사 장소를 조회합니다.
   */
  private async findSimilarPlacesWithDiversity(
    interestedPlaces: Place[],
    limit: number,
  ): Promise<GetBehaviorBasedRecommendationResDto[]> {
    // 1. 관심 장소들의 평균 임베딩 계산
    const avgEmbedding = this.calculateAverageEmbedding(interestedPlaces);
    if (!avgEmbedding) {
      return [];
    }

    // 2. 평균 임베딩과 유사한 장소를 한 번에 조회 (여유있게)
    const interestedPlaceIds = new Set(interestedPlaces.map((p) => p.id));
    const embeddingString = `[${avgEmbedding.join(', ')}]`;

    const candidatePlaces = await this.placeRepo
      .createQueryBuilder('p')
      .where('p.embedding IS NOT NULL')
      .orderBy('p.embedding <=> :embedding', 'ASC')
      .setParameters({ embedding: embeddingString })
      .limit(limit * 5) // 충분한 후보 확보 (필터링 고려)
      .getMany();

    // 3. 카테고리 다양성을 고려하여 추천 목록 구성
    const recommendations: GetBehaviorBasedRecommendationResDto[] = [];
    const recommendedPlaceIds = new Set<string>();
    const categoryCount = new Map<string, number>();

    for (const candidatePlace of candidatePlaces) {
      if (recommendations.length >= limit) {
        break;
      }

      // 관심 보인 장소 자체는 제외
      if (interestedPlaceIds.has(candidatePlace.id)) {
        continue;
      }

      // 이미 추천한 장소는 제외
      if (recommendedPlaceIds.has(candidatePlace.id)) {
        continue;
      }

      // 같은 카테고리가 너무 많으면 건너뛰기 (다양성 확보)
      const currentCategoryCount =
        categoryCount.get(candidatePlace.category) || 0;
      if (currentCategoryCount >= Math.ceil(limit / 3)) {
        continue;
      }

      // 추천 이유: 가장 유사한 관심 장소 찾기
      const mostSimilarPlace = this.findMostSimilarPlace(
        candidatePlace,
        interestedPlaces,
      );

      const reason = new RecommendationReasonDto({
        id: mostSimilarPlace.id,
        title: mostSimilarPlace.title,
      });

      recommendations.push(
        GetBehaviorBasedRecommendationResDto.from(candidatePlace, reason),
      );

      recommendedPlaceIds.add(candidatePlace.id);
      categoryCount.set(candidatePlace.category, currentCategoryCount + 1);
    }

    return recommendations;
  }

  /**
   * 장소들의 평균 임베딩을 계산합니다.
   */
  private calculateAverageEmbeddingFromVectors(
    validEmbeddings: number[][],
  ): number[] | null {
    if (validEmbeddings.length === 0) {
      return null;
    }

    const embeddingLength = validEmbeddings[0].length;
    const sumVector = new Array(embeddingLength).fill(0);

    for (const embedding of validEmbeddings) {
      for (let i = 0; i < embeddingLength; i++) {
        sumVector[i] += embedding[i];
      }
    }

    return sumVector.map((val) => val / validEmbeddings.length);
  }

  /**
   * 장소들의 평균 임베딩을 계산합니다.
   */
  private calculateAverageEmbedding(places: Place[]): number[] | null {
    const validEmbeddings = places
      .map((p) => p.embedding)
      .filter((e): e is number[] => !!e && e.length > 0);

    if (validEmbeddings.length === 0) {
      return null;
    }
    return this.calculateAverageEmbeddingFromVectors(validEmbeddings);
  }
  /**
   * 후보 장소와 가장 유사한 관심 장소를 찾습니다.
   * (추천 이유를 위해 사용)
   */
  private findMostSimilarPlace(
    candidatePlace: Place,
    interestedPlaces: Place[],
  ): Place {
    if (!candidatePlace.embedding || interestedPlaces.length === 0) {
      return interestedPlaces[0];
    }

    let mostSimilar = interestedPlaces[0];
    let maxSimilarity = -1;

    for (const interestedPlace of interestedPlaces) {
      if (!interestedPlace.embedding) continue;

      const similarity = this.calculateCosineSimilarity(
        candidatePlace.embedding,
        interestedPlace.embedding,
      );

      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        mostSimilar = interestedPlace;
      }
    }

    return mostSimilar;
  }

  /**
   * 두 벡터 간의 코사인 유사도를 계산합니다.
   * @returns -1 ~ 1 사이의 값 (1에 가까울수록 유사)
   */
  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      return -1;
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }

    const magnitude = Math.sqrt(magnitude1) * Math.sqrt(magnitude2);

    if (magnitude === 0) {
      return -1;
    }

    return dotProduct / magnitude;
  }
}
