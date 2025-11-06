import { PartialType } from '@nestjs/mapped-types';
import { CreatePoiReqDto } from './create-poi-req.dto';

export class UpdatePoiDto extends PartialType(CreatePoiReqDto) {}
