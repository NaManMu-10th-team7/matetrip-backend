import {
  Injectable,
  InternalServerErrorException,
  NotFoundException, // 👈 NotFoundException 추가
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BinaryContent } from './entities/binary-content.entity';
import { S3Service, S3UploadResponse } from '../../aws/s3.service'; // S3 서비스

export class BinaryContentResponseDto {
  id: string;
  url: string;
  fileName?: string;
  fileType?: string;
  fileSize?: string;
}

@Injectable()
export class BinaryContentService {
  constructor(
    // 1. DB (장부) 레포지토리 주입
    @InjectRepository(BinaryContent)
    private readonly binaryContentRepository: Repository<BinaryContent>,

    // 2. S3 (창고) 서비스 주입
    private readonly s3Service: S3Service,
  ) {}

  /**
   *  S3에 파일을 업로드하고, 그 메타데이터를 DB에 저장합니다.
   * - 파일이 'undefined'면 (선택적 업로드), null을 반환합니다.
   *
   * @param file - 컨트롤러에서 받은 Express.Multer.File (없을 수도 있음)
   * @returns Promise<BinaryContent | null> - 저장된 엔티티 또는 null
   */
  async uploadAndSaveFile(
    file?: Express.Multer.File,
  ): Promise<BinaryContentResponseDto | null> {
    // 2. 파일이 없으면 (프로필 사진 등록 안 함)
    //    S3/DB 작업 아무것도 안 하고 그냥 null 반환
    if (!file) {
      return null;
    }
    let uploadedS3Key: string | null = null;

    // 3. 파일이 있으면 (프로필 사진 등록 함)
    //    S3 업로드 및 DB 저장 로직 수행
    try {
      // 3-1. S3Service를 이용해 S3에 파일 업로드 ('uploads' 폴더에 저장)
      //객체에서 s3Key와 url만 뽑아 쓰고 싶을 때 const { s3Key, url } = …처럼 구조 분해
      //뒤에 : S3UploadResponse를 붙여 “오른쪽 값은 S3UploadResponse 타입이다”라고 TypeScript에게 알려줍니다.
      // 그래서 s3Key, url 각각이 string 인 것을 암
      // 두 필드를 골라서 지역 변수로 꺼내온다는 뜻
      const { s3Key, url }: S3UploadResponse = await this.s3Service.uploadFile(
        file,
        'uploads',
      );
      uploadedS3Key = s3Key;
      // 3-2. DB에 저장할 '장부' (엔티티) 생성
      //s3에는 저장하지 못하는 메타데이터들을 db에 저장
      const newFile = this.binaryContentRepository.create({
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size.toString(),
        s3Key: s3Key, // S3Service에서 받은 Key
        url: url, // S3Service에서 받은 URL
      });

      // 3-3. '장부'를 DB에 저장하고 반환
      const savedFile = await this.binaryContentRepository.save(newFile);
      //반환은 dto 형식으로
      return {
        id: savedFile.id,
        url: savedFile.url,
        fileName: savedFile.fileName,
        fileType: savedFile.fileType,
        fileSize: savedFile.fileSize,
      };
    } catch (error) {
      // S3 업로드는 성공했는데 DB 저장이 실패한 경우 고아 파일 삭제
      if (uploadedS3Key) {
        try {
          await this.s3Service.deleteFile(uploadedS3Key);
        } catch (cleanupError) {
          console.error(
            'Failed to cleanup S3 file after upload error:',
            cleanupError,
          );
        }
      }

      // S3 업로드나 DB 저장 중 하나라도 실패하면
      console.error('Failed to process file upload:', error);
      throw new InternalServerErrorException('Failed to process file upload');
    }
  }

  /**
   *  S3와 DB에서 파일을 삭제합니다.
   */
  async deleteFile(id: string): Promise<void> {
    // 1. DB에서 '장부' 조회 (s3Key가 필요함)
    const file = await this.binaryContentRepository.findOneBy({ id });

    // 1-1. '장부'가 없으면 에러
    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }

    try {
      // 2. S3Service를 이용해 S3 '창고'에서 실제 파일 삭제
      await this.s3Service.deleteFile(file.s3Key);

      // 3. S3 삭제 성공 시, DB에서 '장부' 삭제
      await this.binaryContentRepository.remove(file);
    } catch (error) {
      // S3 삭제나 DB 삭제 중 하나라도 실패하면
      console.error('Failed to delete file:', error);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }
}
