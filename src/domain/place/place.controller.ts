import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlaceService } from './place.service';
import { GetPlacesResDto } from './dto/get-places-res.dto.js';
import { GetPersonalizedPlacesByRegionReqDto } from './dto/get-personalized-places-by-region-req-dto.js';
import { GetPopularPlacesReqDto } from './dto/get-popular-places-req.dto.js';
import { GetPopularPlacesResDto } from './dto/get-popular-places-res.dto.js';
import { GetBehaviorBasedRecommendationReqDto } from './dto/get-behavior-based-recommendation-req.dto.js';
import { GetBehaviorBasedRecommendationResDto } from './dto/get-behavior-based-recommendation-res.dto.js';
import { SearchPlaceByNameQueryDto } from './dto/search-place-by-name-query.dto.js';
import { AuthGuard } from '@nestjs/passport';
import { GetPlaceAndNearbyPlacesResDto } from './dto/get-place-and-nearby-places-res.dto.js';

@Controller('places')
export class PlaceController {
  constructor(private readonly placeService: PlaceService) {}
  /**
   * @description 장소 이름으로 장소를 검색합니다.
   * @param dto - name: 검색어
   * @returns GetPlacesResDto[] - 검색된 장소 목록
   */
  @Get('search')
  @HttpCode(HttpStatus.OK)
  findPlaceIdsByName(
    @Query() dto: SearchPlaceByNameQueryDto,
  ): Promise<{ placeIds: string[] }> {
    return this.placeService.findPlaceIdsByName(dto);
  }

  @Get('search/detail')
  @HttpCode(HttpStatus.OK)
  getPlaces(@Query('word') word: string): Promise<GetPlacesResDto[]> {
    return this.placeService.getPlacesByWord(word);
  }

  /**
   * 목표 : 현재 places테이블의 데이터 중 addplace_id, title, address, image_url 반환하기
   * 순서: user_behavior_events테이블에서 POI_SCHEDULE타입의 이벤트가 많은 순서대로 하기
   * 목표 = 무한 스크롤 방식
   */
  @Get('popular')
  @HttpCode(HttpStatus.OK)
  getPopularPlaces(
    @Query() dto: GetPopularPlacesReqDto,
  ): Promise<GetPopularPlacesResDto[]> {
    return this.placeService.getPopularPlaces(dto);
  }

  @Get('/recommendation')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getPersonalizedPlaces(
    @Query() dto: GetPersonalizedPlacesByRegionReqDto,
  ): Promise<GetPlacesResDto[]> {
    return this.placeService.getPersonalizedPlaces(dto);
  }

  /**
   * @description 지역 그룹 목록을 조회합니다.
   * @author Hugo
   * @returns { { key: string; value: string }[] } 지역 그룹 목록
   */
  @Get('regions')
  @HttpCode(HttpStatus.OK)
  getRegionGroups(): { key: string; value: string }[] {
    return this.placeService.getRegionGroups();
  }

  /**
   * @description 사용자의 행동 데이터(mark, schedule)를 기반으로 유사한 장소를 추천합니다.
   * @param dto - userId, page, limit
   * @returns GetBehaviorBasedRecommendationResDto[] - 추천 장소 목록 (추천 이유 포함)
   */
  @Get('/recommendation/behavior')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getBehaviorBasedRecommendation(
    @Query() dto: GetBehaviorBasedRecommendationReqDto,
  ): Promise<GetBehaviorBasedRecommendationResDto[]> {
    return this.placeService.getBehaviorBasedRecommendation(dto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getPlaceById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GetPlacesResDto> {
    return this.placeService.getPlaceById(id);
  }

  //GetNearbyPlacesReqDto

  @Get(':id/with-nearby')
  @HttpCode(HttpStatus.OK)
  getPlaceAndNearbyPlaces(
    @Param('id', ParseUUIDPipe) placeId: string,
  ): Promise<GetPlaceAndNearbyPlacesResDto> {
    return this.placeService.getPlaceAndNearbyPlaces(placeId);
  }

  // @Get('nearby')
  // getPlacesInBounds(@Query() dto: GetPlacesReqDto): Promise<GetPlacesResDto[]> {
  //   return this.placeService.getPlacesInBounds(dto);
  // }
}
