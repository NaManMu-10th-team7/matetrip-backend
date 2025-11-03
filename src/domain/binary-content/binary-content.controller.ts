import {
  Controller,
  Post,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BinaryContentService } from './binary-content.service';

@Controller('binary-content')
export class BinaryContentController {
  constructor(private readonly binaryContentService: BinaryContentService) {}

  /**
   *  파일 업로드
   * - 'file'이라는 key로 multipart/form-data 요청을 받습니다.
   * - S3에 업로드하고 DB에 메타데이터를 저장합니다.
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file')) // 'file'은 form-data의 key
  async uploadFile(
    @UploadedFile(
      // 유효성 검사 1. 파일 존재 여부 → 2. 용량 검사
      new ParseFilePipe({
        // 파일이 없으면 400 에러 (필수가 아니라면 이 validators 배열을 비워도 됨)
        validators: [
          // 용량 큰 거는 여기서 검사!
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 30 }), // 30MB 제한
        ],
        fileIsRequired: false, // 안 올릴 수도 있음 (선택 사항)
      }),
    )
    file: Express.Multer.File, //검수 완료된 file
  ) {
    // 서비스 로직으로 파일 전달
    return this.binaryContentService.uploadAndSaveFile(file);
  }

  /**
   *  파일 삭제
   * - BinaryContent의 ID (UUID)를 받습니다.
   * - S3와 DB에서 모두 삭제합니다.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // 삭제 성공 시 204 No Content 반환
  async deleteFile(
    @Param('id', new ParseUUIDPipe()) id: string, // ID가 UUID 형식인지 검사
  ) {
    await this.binaryContentService.deleteFile(id);
    // 성공 시 반환값 없음
  }
}
