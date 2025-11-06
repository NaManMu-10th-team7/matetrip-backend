import { PartialType } from '@nestjs/mapped-types';
import { CreatePoiConnectionDto } from './create-poi-connection.dto.js';

export class UpdatePoiConnectionDto extends PartialType(
  CreatePoiConnectionDto,
) {}
