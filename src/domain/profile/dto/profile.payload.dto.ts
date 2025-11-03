import { Expose } from 'class-transformer';
import { GENDER } from '../entities/gender.enum';
import { TravelStyleType } from '../entities/travel-style-type.enum';
import { TendencyType } from '../entities/tendency-type.enum';

export class ProfilePayloadDto {
  @Expose()
  nickname: string;

  @Expose()
  gender: GENDER;

  @Expose()
  description: string;

  @Expose()
  travelStyles?: TravelStyleType[];

  @Expose()
  tendency?: TendencyType[];
}
