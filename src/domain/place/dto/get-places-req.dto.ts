import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class GetPlacesReqDto {
  @Type(() => Number)
  @IsNumber({}, { message: '남서쪽 위도는 유효한 숫자여야 합니다' })
  @Min(-90, { message: '위도는 유효한 숫자여야 합니다' })
  @Max(90, { message: '위도는 유효한 숫자여야 합니다' })
  southWestLatitude: number;

  @Type(() => Number)
  @IsNumber({}, { message: '남서쪽 경도는 유효한 숫자여야 합니다' })
  @Min(-180, { message: '경도는 -180 이상이어야 합니다' })
  @Max(180, { message: '경도는 180 이하여야 합니다' })
  southWestLongitude: number;

  @Type(() => Number)
  @IsNumber({}, { message: '북동쪽 위도는 유효한 숫자여야 합니다' })
  @Min(-90, { message: '위도는 -90 이상이어야 합니다' })
  @Max(90, { message: '위도는 90 이하여야 합니다' })
  northEastLatitude: number;

  @Type(() => Number)
  @IsNumber({}, { message: '북동쪽 경도는 유효한 숫자여야 합니다' })
  @Min(-180, { message: '경도는 -180 이상이어야 합니다' })
  @Max(180, { message: '경도는 180 이하여야 합니다' })
  northEastLongitude: number;
}
