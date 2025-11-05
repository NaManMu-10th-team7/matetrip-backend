import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateProfileDto } from './create-profile.dto';
//import { IsUUID, IsOptional } from 'class-validator';

export class UpdateProfileDto extends PartialType(CreateProfileDto) {
  //partialType -> createprofile-dto에서 변경된 내용만 db에 전송하면 됨
  //profileImageId 만 빼고 상속받음, update 에서는 imageId 만 다른 형식(null 을 포함함)
  // @IsUUID()
  // @IsOptional()
  // profileImageId?: string | null; //제거 가능
}
