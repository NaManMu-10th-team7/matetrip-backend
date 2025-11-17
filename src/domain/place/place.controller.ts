import { Controller, Get, Param, Query } from '@nestjs/common';
import { PlaceService } from './place.service';
import { GetPlacesReqDto } from './dto/get-places-req.dto.js';
import { GetPlacesResDto } from './dto/get-places-res.dto.js';
import { GetPersonalizedPlacesByRegionReqDto } from './dto/get-personalized-places-by-region-req-dto.js';
import { GetPopularPlacesReqDto } from './dto/get-popular-places-req.dto.js';
import { GetPopularPlacesResDto } from './dto/get-popular-places-res.dto.js';
import { GetBehaviorBasedRecommendationReqDto } from './dto/get-behavior-based-recommendation-req.dto.js';
import { GetBehaviorBasedRecommendationResDto } from './dto/get-behavior-based-recommendation-res.dto.js';

@Controller('places')
export class PlaceController {
  constructor(private readonly placeService: PlaceService) {}

  // TODO : Event Driven으로 바꾸기
  @Get()
  getPlacesInBounds(@Query() dto: GetPlacesReqDto): Promise<GetPlacesResDto[]> {
    console.log('dto', dto);
    return this.placeService.getPlacesInBounds(dto);
  }

  /**
   * 목표 : 현재 places테이블의 데이터 중 addplace_id, title, address, image_url 반환하기
   * 순서: user_behavior_events테이블에서 POI_SCHEDULE타입의 이벤트가 많은 순서대로 하기
   * 목표 = 무한 스크롤 방식
   */
  @Get('popular')
  getPopularPlaces(
    @Query() dto: GetPopularPlacesReqDto,
  ): Promise<GetPopularPlacesResDto[]> {
    return this.placeService.getPopularPlaces(dto);
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

  /**
   * @description 사용자의 행동 데이터(mark, schedule)를 기반으로 유사한 장소를 추천합니다.
   * @param dto - userId, page, limit
   * @returns GetBehaviorBasedRecommendationResDto[] - 추천 장소 목록 (추천 이유 포함)
   */
  @Get('/recommendation/behavior')
  async getBehaviorBasedRecommendation(
    @Query() dto: GetBehaviorBasedRecommendationReqDto,
  ): Promise<GetBehaviorBasedRecommendationResDto[]> {
    return this.placeService.getBehaviorBasedRecommendation(dto);
  }

  @Get(':id')
  getPlaceById(@Param('id') id: string): Promise<GetPlacesResDto> {
    return this.placeService.getPlaceById(id);
  }
}
