import { IsInt, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

// 임시 postman 용
export class CreatePoiDto {
  @IsNotEmpty()
  @IsUUID()
  plan_day_id: string;

  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsInt()
  x: number;

  @IsInt()
  y: number;

  @IsNotEmpty()
  address: string;

  @IsOptional() // 장소가 api에서 100퍼 불러와졌었나?
  place_name: string;
}
