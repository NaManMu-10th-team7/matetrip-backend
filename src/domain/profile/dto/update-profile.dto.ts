import { PartialType } from '@nestjs/mapped-types';
import { CreateProfileDto } from './create-profile.dto';

export class UpdateProfileDto extends PartialType(CreateProfileDto) {
  //partialType -> createprofile-dto에서 변경된 내용만 db에 전송하면 됨
}
