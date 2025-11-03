import { Expose } from 'class-transformer';
import { GENDER } from '../entities/gender.enum';
import { TravelStyleType } from '../entities/travel-style-type.enum';
import { TendencyType } from '../entities/tendency-type.enum';
import { MBTI_TYPES } from '../entities/mbti.enum';

export class ProfilePayloadDto {
  @Expose()
  id: string;

  @Expose()
  nickname: string;

  @Expose()
  gender: GENDER;

  @Expose()
  description: string;

  @Expose()
  intro: string;

  @Expose()
  mbtiTypes: MBTI_TYPES;

  @Expose()
  travelStyles?: TravelStyleType[];

  @Expose()
  travelTendency?: TendencyType[];

  @Expose()
  profileImageId?: string | null;
}
