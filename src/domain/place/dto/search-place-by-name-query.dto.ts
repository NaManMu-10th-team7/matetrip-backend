import { IsNotEmpty, IsString } from 'class-validator';

export class SearchPlaceByNameQueryDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
