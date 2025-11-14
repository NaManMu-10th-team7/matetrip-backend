import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PlaceService } from './place.service';
import { GetPlacesReqDto } from './dto/get-places-req.dto.js';
import { GetPlacesResDto } from './dto/get-places-res.dto.js';
import { GetPersonalizedPlacesByRegionReqDto } from './dto/get-personalized-places-by-region-req-dto.js';

@Controller('places')
export class PlaceController {
  constructor(private readonly placeService: PlaceService) {}

  // TODO : Event Driven으로 바꾸기
  @Get()
  getPlacesInBounds(@Query() dto: GetPlacesReqDto): Promise<GetPlacesResDto[]> {
    console.log('dto', dto);
    return this.placeService.getPlacesInBounds(dto);
  }

  @Post('/recommendation')
  async getPersonalizedPlaces(
    @Body() dto: GetPersonalizedPlacesByRegionReqDto,
  ): Promise<GetPlacesResDto[]> {
    return this.placeService.getPersonalizedPlaces(dto);
  }
}
