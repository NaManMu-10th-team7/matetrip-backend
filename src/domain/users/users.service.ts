import { ConflictException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { IsStrongPassword } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from './entities/users.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private usersRepository: Repository<Users>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<Users> {
    const { email, password } = createUserDto;

    // 비밀번호 해싱. 기본값 10
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = this.usersRepository.create({
      email,
      hashedPassword,
    });

    try {
      return await this.usersRepository.save(newUser);
    } catch (error) {
      // 이메일 중복 체크. PostgreSQL unique violation
      if ('23505' == error.code) {
        throw new ConflictException('이미 존재하는 아이디입니다.');
      }

      throw error;
    }
  }

  findAll() {
    return `This action returns all users`;
  }

  async findOne(email: string): Promise<Users | null> {
    return this.usersRepository.findOneBy({ email });
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  /**
   * Controller : API 요청을 받아서 Service 에 전달해
   * Service : 컨트롤러에서 전달한 데이터로 Repository 에 전달해
   * Repository : Service에서 받은 데이터로 DB와 통신해서 데이터를 CRUD 하고, 그 결과를 Service 에 전달해
   * Service : 받은 응답을 Controller 에게 전달해
   * Controller: 받은 응답을 클라이언트에게 전달해
   */
}
