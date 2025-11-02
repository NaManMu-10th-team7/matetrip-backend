import { PartialType } from '@nestjs/mapped-types';
import { CreateBinaryContentDto } from './create-binary-content.dto';

export class UpdateBinaryContentDto extends PartialType(
  CreateBinaryContentDto,
) {}
