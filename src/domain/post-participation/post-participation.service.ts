import { Injectable } from '@nestjs/common';
import { CreatePostParticipationDto } from './dto/create-post-participation.dto';
import { UpdatePostParticipationDto } from './dto/update-post-participation.dto';

@Injectable()
export class PostParticipationService {
  create(createPostParticipationDto: CreatePostParticipationDto) {
    return 'This action adds a new postParticipation';
  }

  findAll() {
    return `This action returns all postParticipation`;
  }

  findOne(id: number) {
    return `This action returns a #${id} postParticipation`;
  }

  update(id: number, updatePostParticipationDto: UpdatePostParticipationDto) {
    return `This action updates a #${id} postParticipation`;
  }

  remove(id: number) {
    return `This action removes a #${id} postParticipation`;
  }
}
