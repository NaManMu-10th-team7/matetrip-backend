import { PartialType } from '@nestjs/mapped-types';
import { PoiCreateReqDto } from './poi-create-req.dto';

export class PoiUpdateDto extends PartialType(PoiCreateReqDto) {}
