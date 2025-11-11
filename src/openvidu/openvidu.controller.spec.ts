import { Test, TestingModule } from '@nestjs/testing';
import { OpenViduController } from './openvidu.controller';
import { OpenViduService } from './openvidu.service';

describe('OpenviduController', () => {
  let controller: OpenViduController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenViduController],
      providers: [OpenViduService],
    }).compile();

    controller = module.get<OpenViduController>(OpenViduController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
