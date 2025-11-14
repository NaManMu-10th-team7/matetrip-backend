import {
  Injectable,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'; // ✅ presigned URL 생성

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly logger = new Logger(S3Service.name);

  private static readonly ALLOWED_CONTENT_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
  ];

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION');
    const bucketName = this.configService.get<string>('AWS_S3_BUCKET');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    if (!region || !bucketName || !accessKeyId || !secretAccessKey) {
      throw new InternalServerErrorException(
        'AWS S3 environment variables are not set correctly.',
      );
    }

    this.region = region;
    this.bucketName = bucketName;
    this.s3Client = new S3Client({
      region: this.region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  buildPublicUrl(key: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  private validateKey(key: string): void {
    if (key.includes('..') || key.includes('./') || key.startsWith('/')) {
      throw new BadRequestException('Invalid file key format');
    }
  }

  private validateContentType(contentType: string): void {
    if (!S3Service.ALLOWED_CONTENT_TYPES.includes(contentType)) {
      throw new BadRequestException(
        `Content type ${contentType} is not allowed`,
      );
    }
  }
  //PUT: 파일을 업로드 하는 함수 (PATCH)
  //url 클라에게 보내기
  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 300, //5min
  ): Promise<string> {
    this.validateKey(key);
    this.validateContentType(contentType);
    //PutObjectCommand : 올리는 것을 허용한다
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    try {
      //url 클라에게 보내기
      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      this.logger.error(
        'Failed to create presigned URL',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Failed to create presigned URL');
    }
  }

  //GET : 사진을 불러오는 함수임
  async generatePresignedGetUrl(
    key: string,
    expiresIn = 3600, // 조회는 1시간 등 더 길게 설정 가능
  ): Promise<string> {
    this.validateKey(key);
    //GetObjectCommand
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      this.logger.error('Failed to create presigned GET URL', error);
      throw new InternalServerErrorException('Failed to create presigned URL');
    }
  }
  /**
   * deleteFile
   * - 프로필 이미지 교체나 프로필 삭제 시 더 이상 쓰이지 않는 객체를 정리할 때 호출.
   * - presigned 방식에서도 기존 삭제 로직은 그대로 재사용한다.
   */

  //  S3에서 파일 삭제하는 메서드
  async deleteFile(s3Key: string): Promise<void> {
    this.validateKey(s3Key);
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });
    try {
      await this.s3Client.send(command);
    } catch (error) {
      this.logger.error('Failed to delete file from S3', error);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }
}
