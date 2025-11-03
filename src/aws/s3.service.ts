import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

/**
 * S3 업로드 결과를 담는 DTO
 */
export interface S3UploadResponse {
  // S3 버킷 내 고유한 파일 키 (파일 삭제/관리에 사용)
  s3Key: string;

  // S3에 업로드된 파일의 전체 URL (클라이언트 접근용)
  url: string;
}

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    // 1. .env 값을 변수로 가져옵니다.
    const region = this.configService.get<string>('AWS_REGION');
    const bucketName = this.configService.get<string>('AWS_S3_BUCKET');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    // 2. 이 값들이 실제로 존재하는지(undefined가 아닌지) 런타임에 확인합니다.
    if (!region || !bucketName || !accessKeyId || !secretAccessKey) {
      throw new InternalServerErrorException(
        'AWS S3 environment variables are not set correctly.',
      );
    }

    // 3. undefined가 아님을 확인 후, 클래스 속성에 할당합니다.
    this.region = region;
    this.bucketName = bucketName;

    // 4. S3 클라이언트 생성 (이제 this.region은 'string' 타입)
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
  }

  /**
   * S3에 파일을 업로드합니다.
   *
   * file - Express.Multer.File 객체 (컨트롤러에서 받음)
   *  folder - S3 버킷 내 저장할 폴더 (예: 'profiles', 'posts')
   * Promise<S3UploadResponse> - s3Key와 url이 담긴 객체
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<S3UploadResponse> {
    //  이 부분에서 S3UploadResponse 인터페이스 사용
    if (!file) {
      throw new InternalServerErrorException('File is not provided');
    }

    const s3Key = `${folder}/${uuidv4()}-${file.originalname}`; //사진마다 고유한 UUID

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    try {
      await this.s3Client.send(command);
      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${s3Key}`;

      return { s3Key, url };
    } catch (error) {
      console.error('Failed to upload file to S3', error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  //  S3에서 파일 삭제하는 메서드
  async deleteFile(s3Key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });
    try {
      await this.s3Client.send(command);
    } catch (error) {
      console.error('Failed to delete file from S3', error);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }
}
