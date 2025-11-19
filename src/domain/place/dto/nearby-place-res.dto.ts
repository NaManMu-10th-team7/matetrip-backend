import { Place } from '../entities/place.entity.js';

export class NearbyPlaceResDto {
  id: string;
  category: string;
  title: string;
  address: string;
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
    image_url?: string,
  ) {
    this.id = id;
    this.category = category;
    this.title = title;
    this.address = address;
    this.image_url = image_url;
    this.longitude = longitude;
    this.latitude = latitude;
  }

  static from(place: Place) {
    return new NearbyPlaceResDto(
      place.id,
      place.category,
      place.title,
      place.address,
      place.longitude,
      place.latitude,
      place.image_url,
    );
  }
}
