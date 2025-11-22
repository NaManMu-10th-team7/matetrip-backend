import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class PoiAddScheduleByPlaceReqDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsNumber()
  @IsNotEmpty()
  dayNo: number;

  @IsString()
  @IsNotEmpty()
  placeId: string;
}
