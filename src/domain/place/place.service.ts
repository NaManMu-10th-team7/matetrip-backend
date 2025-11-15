import { Injectable } from '@nestjs/common';
import { GetPlacesReqDto } from './dto/get-places-req.dto.js';
import { Place } from './entities/place.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { GetPlacesResDto as GetPlacesResDto } from './dto/get-places-res.dto.js';
import { GetPersonalizedPlacesByRegionReqDto } from './dto/get-personalized-places-by-region-req-dto.js';
import { ProfileService } from '../profile/profile.service.js';
import { RegionGroup } from './entities/region_group.enum.js';

@Injectable()
export class PlaceService {
  constructor(
    @InjectRepository(Place)
    private readonly placeRepo: Repository<Place>,
    private readonly profileService: ProfileService,
  ) {}
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
    // const embeddingString = `[${mbeddingValue.join(', ')}]`;
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
}
