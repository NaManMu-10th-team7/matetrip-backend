export class GetMostReviewedPlacesResDto {
  id: string;
  title: string;
  address: string;
  image_url?: string;
  category: string;
  averageRating: number | null;
  reviewCount: number;

  constructor(
    id: string,
    title: string,
    address: string,
    category: string,
    averageRating: number | null,
    reviewCount: number,
    image_url?: string,
  ) {
    this.id = id;
    this.title = title;
    this.address = address;
    this.category = category;
    this.averageRating = averageRating;
    this.reviewCount = reviewCount;
    this.image_url = image_url;
  }

  static from(place: {
    id: string;
    title: string;
    address: string;
    image_url?: string;
    category: string;
    average_rating: string | null;
    review_count: string;
  }): GetMostReviewedPlacesResDto {
    return new GetMostReviewedPlacesResDto(
      place.id,
      place.title,
      place.address,
      place.category,
      place.average_rating ? parseFloat(place.average_rating) : null,
      parseInt(place.review_count, 10),
      place.image_url,
    );
  }
}
