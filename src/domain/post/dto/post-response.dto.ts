import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { PostStatus } from '../entities/post-status.enum';
import { KeywordType } from '../entities/keywords-type.enum';
import { PostParticipationResponseDto } from '../../post-participation/dto/post-participation-response.dto';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class PostResponseDto {
  @Expose()
  @IsUUID()
  id: string;

  @Expose()
  @Type(() => UserResponseDto)
  writer: UserResponseDto;

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

  @Expose()
  @Type(() => PostParticipationResponseDto)
  @ValidateNested({ each: true })
  @IsArray()
  participations: PostParticipationResponseDto[];
}
