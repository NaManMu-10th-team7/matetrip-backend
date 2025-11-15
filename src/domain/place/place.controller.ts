import { Controller, Get, Query } from '@nestjs/common';
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

  @Get('/recommendation')
  async getPersonalizedPlaces(
    @Query() dto: GetPersonalizedPlacesByRegionReqDto,
  ): Promise<GetPlacesResDto[]> {
    console.log('테스트');
    return this.placeService.getPersonalizedPlaces(dto);
  }

  /**
   * @description 지역 그룹 목록을 조회합니다.
   * @author Hugo
   * @returns { { key: string; value: string }[] } 지역 그룹 목록
   */
  @Get('regions')
  getRegionGroups(): { key: string; value: string }[] {
    return this.placeService.getRegionGroups();
  }
}
