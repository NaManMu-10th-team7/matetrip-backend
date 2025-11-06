import { PartialType } from '@nestjs/mapped-types';
import { CreateMessageReqDto } from './create-message-req.dto.js';

export class UpdateChatMessageDto extends PartialType(CreateMessageReqDto) {}
