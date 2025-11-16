import { Place } from '../entities/place.entity.js';
import { RecommendationReasonDto } from './recommendation-reason.dto.js';

export class GetBehaviorBasedRecommendationResDto {
  id: string;
  category: string;
  title: string;
  address: string;
  summary?: string;
  image_url?: string;
  longitude: number;
  latitude: number;

  /**
   * 추천 이유
   */
  reason: RecommendationReasonDto;

  constructor(
    id: string,
    category: string,
    title: string,
    address: string,
    longitude: number,
    latitude: number,
    reason: RecommendationReasonDto,
    summary?: string,
    image_url?: string,
  ) {
    this.id = id;
    this.category = category;
    this.title = title;
    this.address = address;
    this.summary = summary;
    this.image_url = image_url;
    this.longitude = longitude;
    this.latitude = latitude;
    this.reason = reason;
  }

  static from(
    place: Place,
    reason: RecommendationReasonDto,
  ): GetBehaviorBasedRecommendationResDto {
    return new GetBehaviorBasedRecommendationResDto(
      place.id,
      place.category,
      place.title,
      place.address,
      place.longitude,
      place.latitude,
      reason,
      place.summary,
      place.image_url,
    );
  }
}
