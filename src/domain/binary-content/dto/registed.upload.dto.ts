import { IsNotEmpty, IsString } from 'class-validator';
/**
 * 클라이언트가 presigned URL로 업로드를 끝낸 뒤 서버에 호출할 DTO
 * - S3Key: presigned 업로드 때 사용된 경로
 * - fileName/fileType/fileSize: 클라이언트가 다시 보내주는 메타데이터
 *   (정확성을 담보하려면 서버가 발급한 presigned 정보와 비교 검증 가능)
 */
export class RegisterUploadDto {
  @IsString()
  @IsNotEmpty()
  s3Key: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  fileType: string;

  @IsString()
  fileSize: string;
}
