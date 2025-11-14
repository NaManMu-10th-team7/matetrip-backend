import { Injectable } from '@nestjs/common';
import { GetPlacesReqDto } from './dto/get-places-req.dto.js';
import { Place } from './entities/place.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { GetPlacesResDto as GetPlacesResDto } from './dto/get-places-res.dto.js';
import { GetPersonalizedPlacesByRegionReqDto } from './dto/get-personalized-places-by-region-req-dto.js';
import { ProfileService } from '../profile/profile.service.js';
import { Transactional } from 'typeorm-transactional';
import { toSql } from 'pgvector';

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

  @Transactional()
  async getPersonalizedPlaces(dto: GetPersonalizedPlacesByRegionReqDto) {
    /**
     * userid기반으로
     */
    const { userId, region } = dto;
    const embeddingValue =
      await this.profileService.getUserEmbeddingValueByUserId(userId);

    if (!embeddingValue || !embeddingValue[0]) {
      throw new Error('임베딩 벡터를 찾을 수 없습니다.');
    }

    // const embeddingString = `[${mbeddingValue.join(', ')}]`;

    console.log(`profileEmbedding[0] = ${embeddingValue[0]}`);
    const places: Place[] = await this.placeRepo
      .createQueryBuilder('p')
      .where('p.region = :region', { region })
      .orderBy('p.embedding <=> :embedding', 'ASC')
      .setParameters({ embedding: embeddingValue })
      .limit(50)
      .getMany();

    return places.map((place) => GetPlacesResDto.from(place));
  }
}
