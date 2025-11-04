import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PostStatus } from '../entities/post-status.enum';
import { KeywordType } from '../entities/keywords-type.enum';
import { ProfilePayloadDto } from '../../profile/dto/profile.payload.dto';

export class PostResponseDto {
  @Expose()
  @IsUUID()
  id: string;

  @Expose()
  @IsUUID()
  writerId: string;

  @Expose()
  @Type(() => ProfilePayloadDto)
  @IsOptional()
  writerProfile?: ProfilePayloadDto;

  @Expose()
  createdAt: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  title: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  content: string;

  @Expose()
  @IsEnum(PostStatus)
  status: PostStatus;

  @Expose()
  @IsString()
  @IsNotEmpty()
  location: string;

  @Expose()
  @IsInt()
  maxParticipants: number;

  @Expose()
  @IsArray()
  @IsEnum(KeywordType, { each: true })
  keywords: KeywordType[];

  @Expose()
  startDate: string;

  @Expose()
  @IsOptional()
  endDate?: string | null;
}
