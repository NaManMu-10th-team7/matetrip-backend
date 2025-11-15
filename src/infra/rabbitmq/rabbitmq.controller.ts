import { Controller, Get } from '@nestjs/common';
import { RabbitmqProducer } from './rabbitmq.producer.js';

@Controller('rabbitmq')
export class RabbitmqController {
  constructor(private readonly rabbitmqProducer: RabbitmqProducer) {}

  @Get()
  getHello(): string {
    this.rabbitmqProducer.enqueueProfileEmbedding(
      '0c77142e-5fa1-41f4-9a6a-07d80709b660',
    );
    return 'Hello World!';
  }
}
