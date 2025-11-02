import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Profile } from './entities/profile.entity';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
  ) {}
  async create(createProfileDto: CreateProfileDto): Promise<Profile> {
    // 1. DTO 데이터를 기반으로 새로운 Profile 엔티티 인스턴스를 생성합니다.
    // 아직 DB에 저장된 상태는 아닙니다. (TypeORM의 create 메서드)
    const newProfile = this.profileRepository.create(createProfileDto);

    // 2. newProfile 엔티티 객체를 데이터베이스에 저장(INSERT)합니다.
    // save() 메서드가 DB에 데이터를 삽입하고, ID가 채워진 객체를 반환합니다.
    const savedProfile = await this.profileRepository.save(newProfile);

    // 3. 최종적으로 저장된 Profile 엔티티를 반환합니다.
    return savedProfile;
  }

  async findAll(): Promise<Profile[]> {
    // Repository의 find() 메서드는 해당 테이블의 모든 레코드를 조회합니다.
    return this.profileRepository.find();
  }

  async findOne(id: string): Promise<Profile> {
    // Repository의 findOne() 또는 findOneBy() 메서드를 사용합니다.
    const profile = await this.profileRepository.findOne({ where: { id } });

    if (!profile) {
      // 프로필이 없으면 404 Not Found 예외를 발생시킵니다.
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }
    return profile;
  }

  async update(id: string, updateProfileDto: UpdateProfileDto) {
    // findOne는 id로 인해 여러 필드들을 이용해야할 때 사용
    const profile = await this.profileRepository.findOne({ where: { id } });
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }
    // 전달된 dto의 값만 덮어쓰기
    // updateProfileDto에 들어있는 값들만 기존 profile 객체에서 바꿔서 덮어씌웁니다.
    Object.assign(profile, updateProfileDto);

    // DB에 저장 (save는 update와 insert를 자동 구분)
    return await this.profileRepository.save(profile);
  }

  async remove(id: string): Promise<{ message: string }> {
    // 1. 해당 ID의 프로필이 존재하는지 확인합니다
    // findOneby는 단순한 형태로 딱 id 값을 확인하고 싶을 때 사용
    const profile = await this.profileRepository.findOneBy({ id });
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    // 2. Repository의 remove() 메서드는 해당 엔티티를 삭제합니다.
    // 또는 delete() 메서드를 사용하여 바로 삭제할 수도 있습니다: await this.profileRepository.delete(id);
    await this.profileRepository.remove(profile);

    // 삭제 후에는 보통 아무것도 반환하지 않거나 { deleted: true }와 같은 간단한 객체를 반환합니다.
    return { message: `Profile #${id} has been removed successfully` };
  }
}
