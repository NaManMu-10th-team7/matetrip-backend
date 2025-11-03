import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PoiSocketDto } from './dto/poi-socket.dto.js';
import { PoiMarkingDto } from './dto/poi-marking.dto.js';

@WebSocketGateway(3003, { cors: { origin: '*' } })
export class PoiGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('poi-join')
  async handlePoiJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: PoiSocketDto,
  ) {
    console.log(data);
    await socket.join(data.workSpaceId);
    socket.emit('poi-join', data.workSpaceId);
  }

  @SubscribeMessage('poi-leave')
  async handlePoiLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: PoiSocketDto,
  ) {
    await socket.leave(data.workSpaceId);
  }

  @SubscribeMessage('poi/marking')
  handlePoiUpdate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: PoiMarkingDto,
  ) {
    this.server.to(data.workSpaceId).emit('poi/marking', data);
  }
}
