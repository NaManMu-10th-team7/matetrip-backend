import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Profile } from './entities/profile.entity';
import { Users } from '../users/entities/users.entity';
import { ProfilePayloadDto } from './dto/profile.payload.dto'; // 변경된 DTO 임포트
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
  ) {}

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

    // 전달된 필드만 덮어쓰기
    Object.assign(profile, updateProfileDto);

    const updatedProfile = await this.profileRepository.save(profile);

    // DTO로 변환하여 반환
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
    // Repository의 remove() 메서드는 해당 엔티티를 삭제합니다.
    await this.profileRepository.remove(profile);

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
}
