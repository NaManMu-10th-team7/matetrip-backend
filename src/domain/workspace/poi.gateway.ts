import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SocketPoiDto } from './dto/socket-poi.dto.js';
import { CreatePoiDto } from './dto/create-poi.dto.js';

@WebSocketGateway(3003, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
    ],
  },
})
export class PoiGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('poi-join')
  async handlePoiJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: SocketPoiDto,
  ) {
    console.log(data);
    await socket.join(data.workSpaceId);
    socket.emit('poi-join', data.workSpaceId);
  }

  @SubscribeMessage('poi-leave')
  async handlePoiLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: SocketPoiDto,
  ) {
    await socket.leave(data.workSpaceId);
  }

  @SubscribeMessage('poi/marking')
  handlePoiUpdate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: CreatePoiDto,
  ) {
    const mockWorkspaceId = 'mock-workspace-id';
    this.server.to(mockWorkspaceId).emit('poi/marking', data);
  }
}
