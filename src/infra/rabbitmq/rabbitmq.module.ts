import { Module } from '@nestjs/common';
import { RabbitmqProducer } from './rabbitmq.producer';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RabbitmqController } from './rabbitmq.controller.js';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'PROFILE_EMBEDDING_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [
            process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
          ],
          queue: process.env.RABBITMQ_PROFILE_QUEUE,
          queueOptions: {
            durable: true,
          },
          noAck: false,
          prefetchCount: 1,
        },
      },
      {
        name: 'BEHAVIOR_EMBEDDING_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [
            process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
          ],
          queue: process.env.RABBITMQ_BEHAVIOR_QUEUE,
          queueOptions: {
            durable: true,
          },
          noAck: false,
          prefetchCount: 1,
        },
      },
    ]),
  ],
  controllers: [RabbitmqController],
  providers: [RabbitmqProducer],
})
export class RabbitmqModule {}
