import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Profile } from './entities/profile.entity';
import { Users } from '../users/entities/users.entity';
import { GENDER } from './entities/gender.enum';
import { TravelStyleType } from './entities/travel-style-type.enum';
import { TendencyType } from './entities/tendency-type.enum';

/**
 * 클라이언트에 반환되는 프로필 정보 형태
 * - DB의 Profile 엔티티에서 필요한 필드만 선택적으로 포함합니다.
 * - user, profileImage 관계를 id 형태로 단순화시켜 외부 노출을 최소화합니다.
 */
export interface ProfileResponseDto {
  id: string; // Profile ID
  nickname: string;
  gender: GENDER;
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
      description: profile.description,
      travelStyles: profile.travelStyles,
      tendency: profile.tendency,
      userId,
      profileImageId: profile.profileImage?.id ?? null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  /**
   * 프로필 생성
   *  DTO 데이터를 기반으로 새로운 Profile 엔티티 인스턴스를 생성합니다.
   *    (profileData는 createProfileDto에서 userId만 빼고 나머지 필드들을 모은 객체입니다.)
   *  생성된 프로필을 DB에 저장하고, DTO 형태로 반환합니다.
   */
  async create(
    createProfileDto: CreateProfileDto,
  ): Promise<ProfileResponseDto> {
    const { userId, ...profileData } = createProfileDto;

    // userId로 유저 조회
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // 🔒 동일 유저가 이미 프로필을 가진 경우 오류
    const existingProfile = await this.profileRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (existingProfile) {
      throw new ForbiddenException(
        `User with ID ${userId} already has a profile`,
      );
    }

    // 새로운 프로필 생성
    const newProfile = this.profileRepository.create({
      ...profileData,
      user,
    });

    // 데이터베이스에 저장 (INSERT)
    const savedProfile = await this.profileRepository.save(newProfile);

    // 저장된 프로필을 DTO로 변환하여 반환
    return this.toResponseDto(savedProfile);
  }

  /**
   * 전체 프로필 조회
   * Repository의 find() 메서드는 해당 테이블의 모든 레코드를 조회합니다.
   * relations 옵션을 사용해 user, profileImage 관계를 함께 로드합니다.
   * 조회된 엔티티 리스트를 모두 DTO 형태로 변환하여 반환합니다.
   */
  async findAll(): Promise<ProfileResponseDto[]> {
    const profiles = await this.profileRepository.find({
      relations: ['user', 'profileImage'],
    });

    // 모든 엔티티를 DTO로 변환하여 반환
    return profiles.map((profile) => this.toResponseDto(profile));
  }

  /**
   * 단일 프로필 조회
   * Repository의 findOne() 메서드를 사용해 특정 ID의 프로필을 조회합니다.
   * 해당 ID의 프로필이 존재하지 않으면 404 예외를 발생시킵니다.
   * 조회된 엔티티를 DTO로 변환하여 반환합니다.
   */
  async findOne(id: string): Promise<ProfileResponseDto> {
    const profile = await this.profileRepository.findOne({
      where: { id },
      relations: ['user', 'profileImage'],
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    // DTO 변환 후 반환
    return this.toResponseDto(profile);
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
  async update(
    id: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    // 기존 프로필 조회
    const profile = await this.profileRepository.findOne({
      where: { id },
      relations: ['user', 'profileImage'],
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    // //🔒 무결성 검증 - 다른 user가 남의 프로필을 수정하지 못하도록 방지
    if (updateProfileDto.userId !== profile.user.id) {
      throw new ForbiddenException(
        `User ${updateProfileDto.userId} cannot modify another user's profile`,
      );
    }

    // 전달된 필드만 덮어쓰기
    Object.assign(profile, updateProfileDto);

    // DB에 저장 (save는 update와 insert를 자동 구분)
    const updatedProfile = await this.profileRepository.save(profile);

    // DTO로 변환하여 반환
    return this.toResponseDto(updatedProfile);
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
  ): Promise<{ message: string; deletedProfile: ProfileResponseDto }> {
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
    // Repository의 remove() 메서드는 해당 엔티티를 삭제합니다.
    await this.profileRepository.remove(profile);

    // 삭제 후 DTO로 변환하여 반환
    return {
      message: `Profile #${id} has been removed successfully`,
      deletedProfile: this.toResponseDto(profile),
    };
  }
}
