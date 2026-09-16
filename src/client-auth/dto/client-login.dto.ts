import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class ClientLoginDto {
  @ApiProperty({ example: 'cliente@email.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'Informe a senha.' })
  password: string;
}
