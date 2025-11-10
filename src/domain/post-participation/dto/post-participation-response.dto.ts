import { Expose, Type } from 'class-transformer';
import { IsEnum, IsUUID, ValidateNested } from 'class-validator';
import { PostParticipationStatus } from '../entities/post-participation-status';
import { PostResponseDto } from 'src/domain/post/dto/post-response.dto';

export class PostParticipationResponseDto {
  @Expose()
  @IsUUID()
  id: string;

  @Expose()
  @IsEnum(PostParticipationStatus)
  status: PostParticipationStatus;

  @Expose()
  @Type(() => PostResponseDto)
  @ValidateNested()
  post: PostResponseDto;
}
