import {
  Body,
  Controller,
  Get,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { BinaryContentService } from './binary-content.service';
import { CreatePresignedUrlDto } from './dto/create.presigned.url.dto';
import { RegisterUploadDto } from './dto/registed.upload.dto';
import { Users } from '../users/entities/users.entity';

type RequestWithUser = Request & { user: { id: string } };

@Controller('binary-content')
export class BinaryContentController {
  constructor(private readonly service: BinaryContentService) {}

  /**
   * ① presigned URL 발급
   * 클라이언트가 파일을 업로드하기 전에 이 엔드포인트를 호출해
   * S3에 직접 PUT 요청을 보낼 수 있는 임시 URL을 발급받는다.
   *
   * binary_context로 직접 넣음(db)
   */
  @Post('presigned-url')
  async createPresignedUrl(
    @Body() dto: CreatePresignedUrlDto,
    @Req() req: RequestWithUser,
  ) {
    // const user = { id: dto.userId } as Users;
    const user = { id: req.user.id } as Users;
    return this.service.createPresignedUrl(user, dto);
  }

  // @Post('presigned-url')
  // async createPresignedUrl(
  //   @Body() dto: CreatePresignedUrlDto & { userId: string },
  // ) {
  //   const user = { id: dto.userId } as Users;
  //   return this.service.createPresignedUrl(user, dto);
  // }

  /**
   * ② 업로드 완료 후 메타데이터 등록
   * presigned URL로 S3 업로드를 마친 뒤, 해당 파일 정보를 DB에 기록한다.
   * 이때 BinaryContent ID가 생성되어 이후 프로필 이미지로 연결할 수 있다.
   */
  // @Post()
  // async registerUploadedFile(@Body() dto: RegisterUploadDto) {
  //   return this.service.createPresignedUploadUrl(dto);
  // }

  /**
   * ④ 파일 접근용 presigned GET URL 발급
   */
  @Get(':id/presigned-url')
  async getPresignedGetUrl(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.createPresignedGetUrl(id);
  }

  /**
   * ③ 파일 삭제
   * 본인이 업로드한 파일인지 확인한 후 S3와 DB에서 모두 제거한다.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.service.deleteFile(id);
  }
}
