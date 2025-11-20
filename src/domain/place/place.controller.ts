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
import { AuthGuard } from '@nestjs/passport';
import { GetMostReviewedPlacesReqDto } from './dto/get-most-reviewed-places-req.dto.js';
import { GetMostReviewedPlacesResDto } from './dto/get-most-reviewed-places-res.dto.js';
import { GetPlaceAndNearbyPlacesResDto } from './dto/get-place-and-nearby-places-res.dto.js';

@Controller('places')
export class PlaceController {
  constructor(private readonly placeService: PlaceService) {}

  /**
   * @description  무한 스크롤 방식으로 가장 인기있는 장소들을 조회합니다(인기의 기준 = POI_SCHEDULE타입의 이벤트가 많은 순서대로(향후 MARKING도 추가할지 고려))
   * @param dto - 페이지네이션 파라미터 (limit, page) : todo => offset 기반으로 바꾸기 (프론트 코드도 바꿔야되서 일단 나둠)
   * @returns 현재 places테이블의 데이터 중 addplace_id, title, address, image_url 반환하기
   */
  @Get('popular')
  getPopularPlaces(
    @Query() dto: GetPopularPlacesReqDto,
  ): Promise<GetPopularPlacesResDto[]> {
    return this.placeService.getPopularPlaces(dto);
  }

  /**
   * @description 리뷰가 많은 순서대로 장소를 조회합니다.(무한 스크롤)
   * 평균 rating 점수와 리뷰 개수를 포함합니다.
   * @param dto - 페이지네이션 파라미터 (limit, offset)
   * @returns GetMostReviewedPlacesResDto[] - 리뷰가 많은 장소 목록
   */
  @Get('most-reviewed')
  getMostReviewedPlaces(
    @Query() dto: GetMostReviewedPlacesReqDto,
  ): Promise<GetMostReviewedPlacesResDto[]> {
    return this.placeService.getMostReviewedPlaces(dto);
  }

  @Get('/recommendation')
  async getPersonalizedPlaces(
    @Query() dto: GetPersonalizedPlacesByRegionReqDto,
  ): Promise<GetPlacesResDto[]> {
    console.debug('[getPersonalizedPlaces] 호출');
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
  @UseGuards(AuthGuard('jwt'))
  async getBehaviorBasedRecommendation(
    @Query() dto: GetBehaviorBasedRecommendationReqDto,
  ): Promise<GetBehaviorBasedRecommendationResDto[]> {
    return this.placeService.getBehaviorBasedRecommendation(dto);
  }

  @Get(':id')
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
