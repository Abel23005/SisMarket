import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AssistantChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;
}
