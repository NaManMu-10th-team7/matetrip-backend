export class GetPopularPlacesResDto {
  addplace_id: string;
  title: string;
  address: string;
  image_url?: string;

  constructor(
    addplace_id: string,
    title: string,
    address: string,
    image_url?: string,
  ) {
    this.addplace_id = addplace_id;
    this.title = title;
    this.address = address;
    this.image_url = image_url;
  }

  static from(place: {
    id: string;
    title: string;
    address: string;
    image_url?: string;
  }): GetPopularPlacesResDto {
    return new GetPopularPlacesResDto(
      place.id,
      place.title,
      place.address,
      place.image_url,
    );
  }
}
