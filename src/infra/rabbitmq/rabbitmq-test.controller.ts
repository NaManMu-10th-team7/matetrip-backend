import { Controller, Get } from '@nestjs/common';
import { RabbitmqProducer } from './rabbitmq.producer.js';
import {
  BehaviorEventType,
  EnqueueBehaviorEventDto,
} from './dto/enqueue-behavior-event.dto.js';

// !임시컨트롤러
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

  @Get('test-behavior')
  testBehaviorEvent(): string {
    // 테스트용 행동 이벤트 발행 (객체 리터럴로 생성)
    const dto: EnqueueBehaviorEventDto = {
      userId: '0c77142e-5fa1-41f4-9a6a-07d80709b660',
      placeId: '2a56ea65-fa1d-4359-80fe-101096665ba5',
      eventType: BehaviorEventType.POI_MARK,
      timestamp: new Date(),
      weight: 3.0,
      workspaceId: '531c4952-0c80-43ad-ba47-e086d5961677',
    };

    this.rabbitmqProducer.enqueueBehaviorEvent(dto);

    return 'Behavior event sent!';
  }
}
