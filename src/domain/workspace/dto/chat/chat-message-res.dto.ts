export class ChatMessageResDto {
  readonly username: string;
  readonly message: string;

  constructor(username: string, message: string) {
    this.username = username;
    this.message = message;
  }

  static of(username: string, message: string): ChatMessageResDto {
    return new ChatMessageResDto(username, message);
  }
}
