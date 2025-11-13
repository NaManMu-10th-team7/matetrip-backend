import { Place } from '../entities/place.entity.js';

export class GetPlacesInboundsResDto {
  id: string;
  category: string;
  title: string;
  address: string;
  summary?: string; // 요약 설명
  image_url?: string;
  longitude: number;
  latitude: number;

  constructor(
    id: string,
    category: string,
    title: string,
    address: string,
    longitude: number,
    latitude: number,
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
  }

  static from(place: Place) {
    return new GetPlacesInboundsResDto(
      place.id,
      place.category, // DB변경 전 임시
      place.title,
      place.address,
      place.longitude,
      place.latitude,
      place.summary,
      place.image_rul,
    );
  }
}
