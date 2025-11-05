import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { BinaryContent } from './entities/binary-content.entity';
import { CreatePresignedUrlDto } from './dto/create.presigned.url.dto';
import { RegisterUploadDto } from './dto/registed.upload.dto';
import { S3Service } from '../../aws/s3.service';
import { Users } from '../users/entities/users.entity';

export interface PresignedUrlResponse {
  binaryContentId: string;
  uploadUrl: string; // presigned PUT URL
  s3Key: string; // 나중에 등록/삭제할 때 사용할 S3 키
  fileUrl: string; // 업로드 완료 후 접근할 정적 URL
  expiresIn: number; // presigned URL 만료 시간(초)
}

export interface BinaryContentResponseDto {
  id: string;
  // url: string;
  fileName: string;
  fileType: string;
  fileSize: string;
}

@Injectable()
export class BinaryContentService {
  constructor(
    @InjectRepository(BinaryContent)
    private readonly binaryContentRepository: Repository<BinaryContent>,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * ① presigned URL 발급
   * - 사용자가 업로드 버튼을 눌렀을 때, 클라이언트는 이 메서드를 호출해 presigned URL을 받는다.
   * - user, dto 정보를 바탕으로 저장할 S3 Key를 결정.
   * - presigned URL, 추후 이미지 접근 URL, 만료 시간 등을 묶어서 프런트로 반환.
   */
  async createPresignedUrlDB(
    dto: CreatePresignedUrlDto,
  ): Promise<PresignedUrlResponse> {
    const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB 초과시 오류
    if (
      !Number.isFinite(dto.fileSize) ||
      dto.fileSize <= 0 ||
      dto.fileSize > MAX_UPLOAD_SIZE
    ) {
      throw new BadRequestException(
        `파일 크기는 최대 ${MAX_UPLOAD_SIZE}바이트까지 허용됩니다.`,
      );
    }

    const entity = this.binaryContentRepository.create({
      fileName: dto.fileName,
      fileType: dto.fileType,
      fileSize: dto.fileSize.toString(),

      // url: this.s3Service.buildPublicUrl(dto.s3Key),
    });

    //db 저장
    const saved = await this.binaryContentRepository.save(entity);

    if (!saved) {
      console.error('Failed to register uploaded file:', Error);
      throw new InternalServerErrorException('파일 메타데이터 저장 실패');
    }

    const folder = 'uploads'; // 필요한 경우
    //const uniqueName = `${uuidv4()}-${dto.fileName}`;
    const s3Key = `${folder}/${saved.id}`; // 사용자를 구분하는 Key 구조 권장

    const uploadUrl = await this.s3Service.generatePresignedUploadUrl(
      s3Key,
      dto.fileType,
    );

    return {
      binaryContentId: saved.id,
      uploadUrl,
      s3Key,
      fileUrl: this.s3Service.buildPublicUrl(s3Key), // 업로드 후 미리보기용 URL
      expiresIn: 300, // presigned URL 만료 시간 (초)
    };
  }

  // /**
  //  * ② 업로드 완료 후 메타데이터 등록
  //  * - 프런트는 presigned 업로드가 성공하면 이 API를 호출해 DB에 BinaryContent를 저장한다.
  //  * - 동일한 s3Key가 이미 등록되어 있다면 중복 업로드로 판단 → 소유자 검증.
  //  */
  // async createPresignedUploadUrl(
  //   dto: RegisterUploadDto,
  // ): Promise<BinaryContentResponseDto> {
  //   // 1) 신규 엔티티 생성 [유저 검증은 profile에서 할 것임]
  //   const entity = this.binaryContentRepository.create({
  //     fileName: dto.fileName,
  //     fileType: dto.fileType,
  //     fileSize: dto.fileSize.toString(),
  //     // url: this.s3Service.buildPublicUrl(dto.s3Key),
  //   });

  //   try {
  //     //db 저장
  //     const saved = await this.binaryContentRepository.save(entity);

  //     return this.toResponseDto(saved);
  //   } catch (error) {
  //     console.error('Failed to register uploaded file:', error);
  //     throw new InternalServerErrorException('파일 메타데이터 저장 실패');
  //   }
  // }

  async SendUrlToS3(id: string): Promise<{ url: string }> {
    const file = await this.binaryContentRepository.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }
    //프로필 이미지 s3에서 불러오기
    const folder = 'uploads'; // 필요한 경우 user별 폴더로 변경 가능
    //const uniqueName = `${uuidv4()}-${file.fileName}`;

    const url = await this.s3Service.generatePresignedGetUrl(
      `${folder}/${file.id}`,
    );
    return { url };
  }

  /**
   * ③ BinaryContent → 프로필 등에서 쓰기 쉬운 DTO 변환
   */
  private toResponseDto(file: BinaryContent): BinaryContentResponseDto {
    return {
      id: file.id,
      // url: file.url,
      fileName: file.fileName,
      fileType: file.fileType,
      fileSize: file.fileSize,
    };
  }

  /**
   * ④ 파일 삭제
   * - 요청 사용자와 업로드한 사용자가 같은지 확인 후,
   *   S3 객체 삭제 → DB 레코드 삭제 순서로 진행.
   */
  async deleteFile(id: string): Promise<void> {
    const file = await this.binaryContentRepository.findOne({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }

    try {
      await this.s3Service.deleteFile(`uploads/${file.id}`);
      await this.binaryContentRepository.remove(file);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw new InternalServerErrorException('파일 삭제 실패');
    }
  }
}
