import { Place } from '../../place/entities/place.entity';
import { RegionGroup } from '../../place/entities/region_group.enum';

export class ReviewablePlaceItemDto {
  id: string;
  title: string;
  address: string;
  region: RegionGroup;
  latitude: number;
  longitude: number;
  category: string;
  image_url?: string;
  tags: string[];
  summary: string;
  sido: string;
  createdAt: Date;
  planDate: string;

  static from(place: Place, planDate: string): ReviewablePlaceItemDto {
    const dto = new ReviewablePlaceItemDto();
    dto.id = place.id;
    dto.title = place.title;
    dto.address = place.address;
    dto.region = place.region;
    dto.latitude = place.latitude;
    dto.longitude = place.longitude;
    dto.category = place.category;
    dto.image_url = place.image_url;
    dto.tags = place.tags;
    dto.summary = place.summary;
    dto.sido = place.sido;
    dto.createdAt = place.createdAt;

    const date = new Date(planDate);
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][
      date.getUTCDay()
    ];
    dto.planDate = `${planDate} (${dayOfWeek})`;

    return dto;
  }
}
