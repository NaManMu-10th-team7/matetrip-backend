import { Place } from '../entities/place.entity.js';

export class GetPlacesResDto {
  id: string;
  category: string; // todo : category ENUM으로 변경 (안정화 되면)
  title: string;
  address: string;
  summary?: string; // 요약 설명
  image_url?: string;
  longitude: number;
  latitude: number;
  popularityScore?: number; // 인기도 점수 (POI_MARK + POI_SCHEDULE 이벤트 수)

  constructor(
    id: string,
    category: string,
    title: string,
    address: string,
    longitude: number,
    latitude: number,
    summary?: string,
    image_url?: string,
    popularityScore?: number,
  ) {
    this.id = id;
    this.category = category;
    this.title = title;
    this.address = address;
    this.summary = summary;
    this.image_url = image_url;
    this.longitude = longitude;
    this.latitude = latitude;
    this.popularityScore = popularityScore;
  }

  static from(place: Place, popularityScore?: number) {
    return new GetPlacesResDto(
      place.id,
      place.category, // DB변경 전 임시
      place.title,
      place.address,
      place.longitude,
      place.latitude,
      place.summary,
      place.image_url,
      popularityScore,
    );
  }
}
