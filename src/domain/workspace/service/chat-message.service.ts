import { Injectable } from '@nestjs/common';
import { CreateChatMessageDto } from '../chat-message/dto/create-chat-message.dto';
import { UpdateChatMessageDto } from '../dto/chat/update-chat-message.dto';

@Injectable()
export class ChatMessageService {
  create(createChatMessageDto: CreateChatMessageDto) {
    return 'This action adds a new chatMessage';
  }

  findAll() {
    return `This action returns all chatMessage`;
  }

  findOne(id: number) {
    return `This action returns a #${id} chatMessage`;
  }

  update(id: number, updateChatMessageDto: UpdateChatMessageDto) {
    return `This action updates a #${id} chatMessage`;
  }

  remove(id: number) {
    return `This action removes a #${id} chatMessage`;
  }
}
