export class CreateMessageResDto {
  readonly username: string;
  readonly message: string;

  constructor(username: string, message: string) {
    this.username = username;
    this.message = message;
  }

  static of(username: string, message: string): CreateMessageResDto {
    return new CreateMessageResDto(username, message);
  }
}
