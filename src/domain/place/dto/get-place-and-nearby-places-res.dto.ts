import { GetPlacesResDto } from './get-places-res.dto.js';
import { NearbyPlaceResDto } from './nearby-place-res.dto.js';

export class GetPlaceAndNearbyPlacesResDto {
  place: GetPlacesResDto;
  nearbyPlaces: NearbyPlaceResDto[];

  constructor(place: GetPlacesResDto, nearbyPlaces: NearbyPlaceResDto[]) {
    this.place = place;
    this.nearbyPlaces = nearbyPlaces;
  }
}
