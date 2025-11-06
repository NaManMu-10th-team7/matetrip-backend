import { Injectable } from '@nestjs/common';
import { UpdateChatMessageReqDto } from '../dto/chat/update-chat-message-req.dto';
import { CreateMessageReqDto } from '../dto/chat/create-message-req.dto.js';

@Injectable()
export class ChatMessageService {
  create(createChatMessageDto: CreateMessageReqDto) {
    return 'This action adds a new chatMessage';
  }

  findAll() {
    return `This action returns all chatMessage`;
  }

  findOne(id: number) {
    return `This action returns a #${id} chatMessage`;
  }

  update(id: number, updateChatMessageDto: UpdateChatMessageReqDto) {
    return `This action updates a #${id} chatMessage`;
  }

  remove(id: number) {
    return `This action removes a #${id} chatMessage`;
  }
}
