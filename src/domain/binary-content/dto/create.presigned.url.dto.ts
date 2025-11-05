import { IsNotEmpty, IsString, IsNumber, Min, Max } from 'class-validator';
/**
 * presigned URL 발급을 위한 요청 DTO
 * - 클라이언트가 업로드할 파일의 메타데이터를 먼저 서버에 알려준다.
 * - 서버는 이 정보를 활용해 업로드 가능한 MIME 타입, 최대 파일 크기 등을 검증하고, 적절한 Key를 만들어 presigned URL을 발급한다.
 */
export class CreatePresignedUrlDto {
  @IsString()
  @IsNotEmpty()
  fileName: string; // 사용자가 업로드하려는 원본 파일명

  @IsString()
  @IsNotEmpty()
  fileType: string; // MIME 타입 (예: image/png). S3에 ContentType으로 전달.

  @IsNumber()
  @Min(1)
  @Max(1024 * 1024 * 50) // 50MB 제한 (필요에 맞춰 수정)
  fileSize: number; // 파일 크기. 너무 큰 업로드를 차단하고 싶을 때 검증용.

  // // FIXME: JWT 붙이기 전까지 임시로 userId를 받는다.
  // //_---------------- 임시용----------------
  // @IsString()
  // @IsNotEmpty()
  // userId: string;
}
