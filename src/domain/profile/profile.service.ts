import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Profile } from './entities/profile.entity';
import { Users } from '../users/entities/users.entity';
import { GENDER } from './entities/gender.enum';
import { TravelStyleType } from './entities/travel-style-type.enum';
import { TendencyType } from './entities/tendency-type.enum';
import { ProfilePayloadDto } from './dto/profile.payload.dto'; // 변경된 DTO 임포트
import { plainToInstance } from 'class-transformer';
import { BinaryContentService } from '../binary-content/binary-content.service';
import { BinaryContent } from '../binary-content/entities/binary-content.entity';
import { RabbitmqProducer } from '../../infra/rabbitmq/rabbitmq.producer.js';
import { Transactional } from 'typeorm-transactional';
import { MatchingService } from './matching.service';
//상세소개 , 여행 성향, 여행 스타일 얻는 dto 가 아래
import { buildEmbeddingPayloadFromSource } from './utils/embedding-payload.util';

/**
 * 클라이언트에 반환되는 프로필 정보 형태
 * - DB의 Profile 엔티티에서 필요한 필드만 선택적으로 포함합니다.
 * - user, profileImage 관계를 id 형태로 단순화시켜 외부 노출을 최소화합니다.
 */
export interface ProfileResponseDto {
  id: string; // Profile ID
  nickname: string;
  gender: GENDER;
  mannerTemperature: number;
  description: string;
  travelStyles: TravelStyleType[];
  tendency: TendencyType[];
  userId: string;
  profileImageId: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,

    private readonly binaryContentService: BinaryContentService,
    @InjectRepository(BinaryContent)
    private readonly binaryContentRepository: Repository<BinaryContent>,
    private readonly rabbitMQProducer: RabbitmqProducer,
    private readonly matchingService: MatchingService,
  ) {}

  /**
   * Entity → DTO 변환 함수
   * - Profile 엔티티를 클라이언트에 반환 가능한 ProfileResponseDto 형태로 변환합니다.
   * - user 객체 전체가 아니라 user.id만 포함시켜 외부 노출 범위를 제한
   */
  private toResponseDto(profile: Profile): ProfileResponseDto {
    const userId = profile.user?.id;
    if (!userId) {
      throw new NotFoundException(
        `User associated with Profile ${profile.id} not found`,
      );
    }

    return {
      id: profile.id,
      nickname: profile.nickname,
      gender: profile.gender,
      mannerTemperature: profile.mannerTemperature,
      description: profile.description,
      travelStyles: profile.travelStyles,
      tendency: profile.tendency,
      userId,
      profileImageId: profile.profileImage?.id ?? null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  // /**
  //  * 프로필 생성
  //  *  DTO 데이터를 기반으로 새로운 Profile 엔티티 인스턴스를 생성합니다.
  //  *    (profileData는 createProfileDto에서 userId만 빼고 나머지 필드들을 모은 객체입니다.)
  //  *  생성된 프로필을 DB에 저장하고, DTO 형태로 반환합니다.
  //  */
  // async create(
  //   createProfileDto: CreateProfileDto,
  // ): Promise<ProfileResponseDto> {
  //   const { userId, profileImageId, ...profileData } = createProfileDto;

  //   // userId로 유저 조회
  //   const user = await this.usersRepository.findOne({ where: { id: userId } });
  //   if (!user) {
  //     throw new NotFoundException(`User with ID ${userId} not found`);
  //   }

  //   // 🔒 동일 유저가 이미 프로필을 가진 경우 오류
  //   const existingProfile = await this.profileRepository.findOne({
  //     where: { user: { id: userId } },
  //     relations: ['user'],
  //   });
  //   if (existingProfile) {
  //     throw new ForbiddenException(
  //       `User with ID ${userId} already has a profile`,
  //     );
  //   }
  //   //🔒 무결성 검증 imageId 가 있는데 이상한 경우
  //   let profileImage: BinaryContent | null = null;
  //   if (typeof profileImageId === 'string') {
  //     //만약 실제 값이 있다면(null/ undefined 가 아니라면),
  //     const binary = await this.binaryContentRepository.findOneBy({
  //       id: profileImageId,
  //     });
  //     if (!binary) {
  //       throw new NotFoundException(
  //         `BinaryContent (Image) with ID ${profileImageId} not found`,
  //       );
  //     }

  //     const existingOwner = await this.profileRepository.findOne({
  //       where: { profileImage: { id: profileImageId } },
  //       relations: ['user'],
  //     });
  //     if (existingOwner && existingOwner.user.id !== userId) {
  //       throw new ForbiddenException(
  //         `BinaryContent (Image) with ID ${profileImageId} is already in use by another profile`,
  //       );
  //     }

  //     profileImage = binary;
  //   }

  //   // 새로운 프로필 생성
  //   const newProfile = this.profileRepository.create({
  //     ...profileData,
  //     user,
  //     profileImage,
  //   });

  //   // 데이터베이스에 저장 (INSERT)
  //   const savedProfile = await this.profileRepository.save(newProfile);

  //   // 저장된 프로필을 DTO로 변환하여 반환
  //   return this.toResponseDto(savedProfile);
  // }

  /**
   * 전체 프로필 조회
   * Repository의 find() 메서드는 해당 테이블의 모든 레코드를 조회합니다.
   * relations 옵션을 사용해 user, profileImage 관계를 함께 로드합니다.
   * 조회된 엔티티 리스트를 모두 DTO 형태로 변환하여 반환합니다.
   */
  async findAll(): Promise<ProfilePayloadDto[]> {
    const profiles = await this.profileRepository.find({
      relations: ['user', 'profileImage'],
    });

    // 모든 엔티티를 DTO로 변환하여 반환
    return profiles.map((profile) => this.toProfilePayloadDto(profile));
  }

  /**
   * 단일 프로필 조회
   * Repository의 findOne() 메서드를 사용해 특정 ID의 프로필을 조회합니다.
   * 해당 ID의 프로필이 존재하지 않으면 404 예외를 발생시킵니다.
   * 조회된 엔티티를 DTO로 변환하여 반환합니다.
   */
  async findOne(id: string): Promise<ProfilePayloadDto> {
    const profile = await this.profileRepository.findOne({
      where: { id },
      relations: ['user', 'profileImage'],
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    // DTO 변환 후 반환
    return this.toProfilePayloadDto(profile);
  }

  /**
   * 프로필 수정
   * 1. ID로 해당 프로필을 조회하고, 없으면 404 예외를 던집니다.
   * 2. 요청한 userId와 프로필의 실제 소유자(user.id)가 다르면 ForbiddenException을 발생시킵니다.
   *    → 다른 유저가 남의 프로필을 수정하는 것을 방지합니다.
   * 3. 전달된 DTO의 값만 기존 프로필 객체에 덮어씌웁니다.
   *    (Object.assign을 통해 updateProfileDto에 들어있는 필드만 변경됩니다.)
   * 4. save() 메서드를 통해 변경된 엔티티를 DB에 저장하고, DTO 형태로 반환합니다.
   */

  @Transactional()
  async update(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<ProfilePayloadDto> {
    // 기존 프로필 조회
    const profile = await this.profileRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'profileImage'],
    });

    if (!profile) {
      throw new NotFoundException(`프로필을 찾을 수 없습니다.`);
    }

    const { profileImageId, ...textData } = updateProfileDto;

    const prevTravelStyles = [...(profile.travelStyles ?? [])];
    const prevTendencies = [...(profile.tendency ?? [])];
    const prevDescription = profile.description ?? '';

    // 전달된 필드만 덮어쓰기 🌟(사진 파일 제외)
    Object.assign(profile, textData);

    //사진 파일 따로 처리
    const oldImageId = profile.profileImage?.id || null;
    if (profileImageId !== undefined) {
      // 이미지를 '제거'하라는 요청 (null)
      if (profileImageId === null) {
        profile.profileImage = null;
      } else if (profileImageId === oldImageId) {
        // 동일한 이미지를 다시 설정하려면 아무 작업도 하지 않는다.
        // 텍스트 데이터 변경은 그대로 진행된다.
      }
      //  이미지를 '교체/추가'하라는 요청 (string ID)
      else {
        const newImage = await this.binaryContentRepository.findOneBy({
          id: profileImageId,
        });
        if (!newImage) {
          throw new NotFoundException(
            `BinaryContent (Image) with ID ${profileImageId} not found`,
          );
        }

        // 🔒 다른 프로필에서 이미 사용 중인지 검증 (타인 이미지 탈취 방지)
        // "이 이미지를 사용하면서, ID가 '내 ID'가 '아닌' 프로필"을 찾습니다.
        const otherProfileUsingImage = await this.profileRepository.findOne({
          where: {
            profileImage: { id: profileImageId }, // 1. 이 이미지를 사용하고
            id: Not(profile.id), // 2. 현재 프로필(profile.id)이 아닌
          },
        });

        // 만약 그런 '다른' 프로필이 존재한다면 -> 에러
        if (otherProfileUsingImage) {
          throw new ForbiddenException(
            `BinaryContent (Image) with ID ${profileImageId} is already linked to another profile`,
          );
        }

        profile.profileImage = newImage;
      }
      // profileImageId가 undefined면 (DTO에 안 들어왔으면) 아무것도 안 함 (기존 유지)
    }

    // 프로필 DB에 저장 (텍스트 + 이미지 관계 변경 사항 적용)
    const updatedProfile = await this.profileRepository.save(profile);

    // (핵심) '고아 파일' 삭제
    //    - 옛날 이미지가 있었고 (oldImageId !== null)
    //    - 그게 새 이미지 ID와 다르다면 (oldImageId !== updatedProfile.profileImage?.id)
    if (oldImageId && oldImageId !== updatedProfile.profileImage?.id) {
      const remainingReferences = await this.profileRepository.count({
        where: { profileImage: { id: oldImageId } },
      });

      if (remainingReferences === 0) {
        // S3와 DB에서 '옛날 파일' 삭제 (더 이상 어떤 프로필에서도 사용하지 않을 때만)
        await this.binaryContentService.deleteFile(oldImageId);
      }
    }
    //📌임베딩 진행
    const shouldReembed = this.shouldRebuildEmbedding(
      prevTravelStyles,
      updatedProfile.travelStyles ?? [],
      prevTendencies,
      updatedProfile.tendency ?? [],
      prevDescription,
      updatedProfile.description ?? '',
    );
    //변경되었다면 임베딩 시작
    if (shouldReembed) {
      //임베딩 코드
      await this.matchingService.embeddingMatchingProfile(
        userId,
        buildEmbeddingPayloadFromSource(updatedProfile),
      );
    }

    // DTO로 변환하여 반환
    this.rabbitMQProducer.enqueueProfileEmbedding(userId);
    return this.toProfilePayloadDto(updatedProfile);
  }
  /**
   * 프로필 삭제
   * 1. 해당 ID의 프로필이 존재하는지 확인합니다. (존재하지 않으면 404 예외)
   * 2. Repository의 remove() 메서드는 해당 엔티티를 실제로 삭제합니다.
   *    (delete()를 사용하면 즉시 삭제 가능하지만, remove()는 엔티티 객체 기반으로 동작)
   * 3. 삭제 후에는 간단한 메시지와 함께 삭제된 프로필 정보를 DTO 형태로 반환합니다.
   */
  async remove(
    id: string,
    userId: string,
  ): Promise<{ message: string; deletedProfile: ProfilePayloadDto }> {
    // 해당 ID의 프로필이 존재하는지 확인
    //user나 profileImage만 다른 테이블과의 관계이기 때문에, 이 둘은 relations에 명시해야 실제 엔티티가 함께 로드
    const profile = await this.profileRepository.findOne({
      where: { id },
      relations: ['user', 'profileImage'],
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }
    // 🔒 다른 유저가 삭제 못하도록 방지
    if (profile.user.id !== userId) {
      throw new ForbiddenException(
        `User ${userId} cannot delete another user's profile`,
      );
    }

    const profileImageId = profile.profileImage?.id ?? null;
    // Repository의 remove() 메서드는 해당 프로필 엔티티를 삭제합니다.
    await this.profileRepository.remove(profile);

    //실제 s3에서 파일 지우기
    // 🔒 다른 유저가 이미지 삭제 못하도록 방지
    if (profileImageId) {
      const remainingReferences = await this.profileRepository.count({
        //현재 DB에 이 이미지(profileImageId)를 쓰고 있는 프로필이 몇 개 있는지 센 값

        where: { profileImage: { id: profileImageId } },
      });

      if (remainingReferences === 0) {
        //아무 것도 참조하고 있지 않을 떄
        await this.binaryContentService.deleteFile(profileImageId);
        //S3와 binary_content 테이블에서 해당 파일·메타데이터를 삭제합니다.
      }
    }

    // 삭제 후 DTO로 변환하여 반환
    return {
      message: `Profile #${id} has been removed successfully`,
      deletedProfile: this.toProfilePayloadDto(profile),
    };
  }

  async getProfileByUserId(userId: string): Promise<ProfilePayloadDto> {
    const profile = await this.profileRepository.findOne({
      where: {
        user: {
          id: userId,
        },
      },
      relations: ['user', 'profileImage'],
    });

    if (!profile) {
      throw new NotFoundException('해당 유저의 프로필을 찾을 수 없습니다.');
    }

    return this.toProfilePayloadDto(profile);
  }

  async getUserEmbeddingValueByUserId(userId: string) {
    const profile = await this.profileRepository.findOne({
      where: {
        user: {
          id: userId,
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('해당 유저의 프로필을 찾을 수 없습니다.');
    }
    if (!profile.profileEmbedding) {
      throw new NotFoundException(
        '해당 유저의 임베딩 벡터를 찾을 수 없습니다.',
      );
    }

    return profile.profileEmbedding;
  }

  /**
   * Entity → DTO 변환 함수
   * - Profile 엔티티를 클라이언트에 반환 가능한 ProfilePayloadDto 형태로 변환합니다.
   * - user 객체 전체가 아니라 user.id만 포함시켜 외부 노출 범위를 제한
   */
  private toProfilePayloadDto(profile: Profile): ProfilePayloadDto {
    const profileWithEmail = {
      ...profile,
      email: profile.user.email, // User 엔티티에서 이메일 가져오기
    };
    const payload = plainToInstance(ProfilePayloadDto, profileWithEmail, {
      excludeExtraneousValues: true,
    });
    payload.profileImageId = profile.profileImage?.id ?? null;

    return payload;
  }

  private shouldRebuildEmbedding(
    prevStyles: TravelStyleType[],
    nextStyles: TravelStyleType[],
    prevTendencies: TendencyType[],
    nextTendencies: TendencyType[],
    prevDescription: string,
    nextDescription: string,
  ): boolean {
    // 이전/현재 값을 비교해서 여행 스타일·성향·상세소개 중 하나라도 달라졌으면 true를 반환한다.
    // (임베딩을 새로 만들 필요가 있는지 판별용)
    return (
      !this.areArraysEqual(prevStyles, nextStyles) ||
      !this.areArraysEqual(prevTendencies, nextTendencies) ||
      prevDescription.trim() !== nextDescription.trim()
    );
  }

  private areArraysEqual<T>(a: T[], b: T[]): boolean {
    // 정렬 후 요소를 하나씩 비교해 두 배열의 구성이 동일한지 판단한다.
    if (a.length !== b.length) {
      return false;
    }
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((value, index) => value === sortedB[index]);
  }
}
