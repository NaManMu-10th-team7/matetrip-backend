import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Users } from './entities/users.entity';
import * as bcrypt from 'bcrypt';
import { Profile } from '../profile/entities/profile.entity';
import { UserPayloadDto } from './dto/user.payload.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private usersRepository: Repository<Users>,

    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,

    private readonly dataSource: DataSource,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserPayloadDto> {
    const { email, password, profile } = createUserDto;

    // 비밀번호 해싱. 기본값 10
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
      const createdUser = await this.dataSource.transaction(async (manager) => {
        // 이메일 중복 여부를 DB 에러가 아닌 로직으로 미리 확인
        const userExists = await manager.existsBy(Users, { email });
        if (userExists) {
          throw new ConflictException('이미 존재하는 이메일입니다.');
        }

        // 트랜잭션 내에서 User를 먼저 생성
        const newUser = manager.create(Users, {
          email,
          hashedPassword,
        });

        const savedUser = await manager.save(newUser);

        // User와 연결된 Profile 생성
        const newProfile = manager.create(Profile, {
          ...profile,
          user: savedUser,
        });
        await manager.save(newProfile);

        // 관계가 설정된 user를 다시 조회해 반환
        const userWithProfile = await manager.findOne(Users, {
          where: { id: savedUser.id },
          relations: ['profile'],
        });

        if (!userWithProfile) {
          throw new InternalServerErrorException(
            '사용자 생성 후 조회에 실패했습니다.',
          );
        }

        return userWithProfile;
      });

      return this.toUserPayloadDto(createdUser);
    } catch (error) {
      // DB 트랜잭션 중 발생한 에러 처리
      if (
        error instanceof ConflictException ||
        error instanceof InternalServerErrorException
      ) {
        // 이메일 중복 및 내부 에러는 그대로 다시 던짐
        throw error;
      }

      // 그 외 에러는 로깅
      console.error(error);

      throw new InternalServerErrorException(
        '회원가입 중 오류가 발생했습니다.',
      );
    }
  }

  findAll() {
    return `This action returns all users`;
  }

  async findOne(email: string): Promise<Users | null> {
    // Users 엔티티 조회 시, 관련 Profile 엔티티도 불러와야 누락 발생 안함
    return this.usersRepository.findOne({
      where: { email },
      relations: ['profile'],
    });
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  // Users 엔티티를 UserPayloadDto로 변환 헬퍼 함수
  public toUserPayloadDto(user: Users): UserPayloadDto {
    return plainToInstance(UserPayloadDto, user, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Controller : API 요청을 받아서 Service 에 전달해
   * Service : 컨트롤러에서 전달한 데이터로 Repository 에 전달해
   * Repository : Service에서 받은 데이터로 DB와 통신해서 데이터를 CRUD 하고, 그 결과를 Service 에 전달해
   * Service : 받은 응답을 Controller 에게 전달해
   * Controller: 받은 응답을 클라이언트에게 전달해
   */
}
