import {
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PositionDto {
  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  lat: number;

  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  lng: number;
}

export class MapClickReqDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ValidateNested()
  @Type(() => PositionDto)
  position: PositionDto;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  userColor: string;

  @IsString()
  @IsNotEmpty()
  userName: string;
}
