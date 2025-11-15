import { Module } from '@nestjs/common';
import { RabbitmqProducer } from './rabbitmq.producer';
import { RabbitmqController } from './rabbitmq.controller.js';
import { RabbitMQConfig } from '../rabbitmq.config.js';

@Module({
  imports: [RabbitMQConfig],
  controllers: [RabbitmqController],
  providers: [RabbitmqProducer],
  exports: [RabbitmqProducer],
})
export class RabbitmqModule {}
