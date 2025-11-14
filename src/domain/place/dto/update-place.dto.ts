import { PartialType } from '@nestjs/mapped-types';
import { CreatePlaceReqDto } from './create-place-req.dto';

export class UpdatePlaceDto extends PartialType(CreatePlaceReqDto) {}
