import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { CreateProfileDto } from 'src/domain/profile/dto/create-profile.dto';

export class CreateUserDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^(?=.*[a-zA-Z])(?=.*[0-9])[a-zA-Z0-9]{8,25}$/, {
    message: '비밀번호는 영문, 숫자 조합으로 8자 이상이어야 합니다.',
  })
  password: string;

  //   @IsString()
  //   @IsNotEmpty()
  //   passwordConfirmation: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CreateProfileDto)
  profile: CreateProfileDto;
}
