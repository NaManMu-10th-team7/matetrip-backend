import { PartialType } from '@nestjs/mapped-types';
import { CreatePostParticipationDto } from './create-post-participation.dto';

export class UpdatePostParticipationDto extends PartialType(
  CreatePostParticipationDto,
) {}
