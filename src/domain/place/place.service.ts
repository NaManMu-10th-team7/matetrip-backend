import { Injectable } from '@nestjs/common';
import { GetPlacesInboundsReqDto } from './dto/get-places-inbounds-req.dto.js';
import { Place } from './entities/place.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { GetPlacesInboundsResDto } from './dto/get-places-inbounds-res.dto.js';

@Injectable()
export class PlaceService {
  constructor(
    @InjectRepository(Place)
    private readonly placeRepo: Repository<Place>,
  ) {}
  async getPlacesInBounds(
    dto: GetPlacesInboundsReqDto,
  ): Promise<GetPlacesInboundsResDto[]> {
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
    });
    return places.map((place) => GetPlacesInboundsResDto.from(place));
  }

  findOne(id: number) {
    return `This action returns a #${id} place`;
  }
}
