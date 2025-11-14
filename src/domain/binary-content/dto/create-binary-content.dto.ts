import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBinaryContentDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  fileType: string;

  //int 범위 내의 filesize, 그 이상은 string
  @IsString()
  @IsNotEmpty()
  fileSize: string;
}
