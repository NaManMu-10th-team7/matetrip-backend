import { Controller, Get } from '@nestjs/common';
import { RabbitmqProducer } from './rabbitmq.producer.js';

@Controller('rabbitmq')
export class RabbitmqController {
  constructor(private readonly rabbitmqProducer: RabbitmqProducer) {}

  @Get()
  getHello(): string {
    this.rabbitmqProducer.enqueueProfileEmbedding('ㅎㅇ');
    return 'Hello World!';
  }
}
