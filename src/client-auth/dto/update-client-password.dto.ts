import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class UpdateClientPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'Informe a senha atual.' })
  currentPassword: string;

  @ApiProperty({
    minLength: 8,
    description: 'Mín. 8 caracteres, com maiúscula, minúscula e número.',
  })
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres.' })
  @Matches(/[A-Z]/, {
    message: 'A senha deve conter ao menos uma letra maiúscula.',
  })
  @Matches(/[a-z]/, {
    message: 'A senha deve conter ao menos uma letra minúscula.',
  })
  @Matches(/[0-9]/, { message: 'A senha deve conter ao menos um número.' })
  newPassword: string;
}
