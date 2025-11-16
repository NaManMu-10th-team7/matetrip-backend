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

@Injectable()
export class PlaceService {
  constructor(
    @InjectRepository(Place)
    private readonly placeRepo: Repository<Place>,
    private readonly profileService: ProfileService,
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
    console.log('southWestLatitude', southWestLatitude);
    console.log('southWestLongitude', southWestLongitude);
    console.log('northEastLatitude', northEastLatitude);
    console.log('northEastLongitude', northEastLongitude);

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
   * @param dto - userId, page, limit
   * @returns GetBehaviorBasedRecommendationResDto[] - 추천 장소 목록 (추천 이유 포함)
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
    const recommendations = await this.findSimilarPlacesWithDiversity(
      interestedPlaces,
      limit,
    );

    return recommendations;
  }

  /**
   * 최근 N일간 사용자가 관심 보인 장소들을 조회합니다.
   * - POI_SCHEDULE (일정에 추가)
   * - POI_MARK (마크)
   * 이벤트를 기준으로 조회합니다.
   */
  private async getRecentInterestedPlaces(
    userId: string,
    recentDays: number,
  ): Promise<Place[]> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - recentDays);

    const places = await this.placeRepo
      .createQueryBuilder('place')
      .innerJoin(
        'user_behavior_events',
        'event',
        'event.place_id = place.id AND event.user_id = :userId AND event.event_type IN (:...eventTypes) AND event.created_at >= :sinceDate',
        {
          userId,
          eventTypes: ['POI_SCHEDULE', 'POI_MARK'],
          sinceDate,
        },
      )
      .select('place.*')
      .addSelect('event.created_at', 'event_created_at')
      .orderBy('event.created_at', 'DESC')
      .getRawMany<{
        place_id: string;
        place_category: string;
        place_title: string;
        place_address: string;
        place_summary?: string;
        place_image_url?: string;
        place_longitude: number;
        place_latitude: number;
        place_embedding: number[] | null;
      }>();

    // Place 엔티티로 변환 (embedding이 있는 것만 반환)
    return places
      .filter((raw) => raw.place_embedding !== null)
      .map((raw) => {
        const place = new Place();
        place.id = raw.place_id;
        place.category = raw.place_category;
        place.title = raw.place_title;
        place.address = raw.place_address;
        place.summary = raw.place_summary ?? '';
        place.image_url = raw.place_image_url;
        place.longitude = raw.place_longitude;
        place.latitude = raw.place_latitude;
        place.embedding = raw.place_embedding;
        return place;
      });
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
