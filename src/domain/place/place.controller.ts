import { Body, Controller, Get, Query } from '@nestjs/common';
import { PlaceService } from './place.service';
import { GetPlacesInboundsReqDto } from './dto/get-places-inbounds-req.dto.js';
import { GetPlacesInboundsResDto } from './dto/get-places-inbounds-res.dto.js';
import { GetPersonalizedPlacesByRegionReqDto } from './dto/get-personalized-places-by-region-req-dto.js';

@Controller('places')
export class PlaceController {
  constructor(private readonly placeService: PlaceService) {}

  // TODO : Event Driven으로 바꾸기
  @Get()
  getPlacesInBounds(
    @Query() dto: GetPlacesInboundsReqDto,
  ): Promise<GetPlacesInboundsResDto[]> {
    console.log('dto', dto);
    return this.placeService.getPlacesInBounds(dto);
  }

  @Get()
  getPersonalizedPlaces(@Body() dto: GetPersonalizedPlacesByRegionReqDto) {
    return this.placeService.getPersonalizedPlaces(dto);
  }
}
