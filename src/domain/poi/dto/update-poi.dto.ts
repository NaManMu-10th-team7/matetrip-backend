import { PartialType } from '@nestjs/mapped-types';
import { CreatePoiDto } from './create-poi.dto';

export class UpdatePoiDto extends PartialType(CreatePoiDto) {}
