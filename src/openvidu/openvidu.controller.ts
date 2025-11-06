import { Body, Controller, Post } from '@nestjs/common';
import { OpenViduService } from './openvidu.service';

@Controller('openvidu')
export class OpenViduController {
  constructor(private readonly ov: OpenViduService) {}

  /**
   * ✅ React에서 방 입장 버튼 누르면 호출
   * workspaceId (= 방 구분하는 ID)
   */
  @Post('chatstart')
  async getToken(@Body() body: { workspaceId: string }) {
    const token = await this.ov.generateToken(body.workspaceId);
    return { token };
  }
}
