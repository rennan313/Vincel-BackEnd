import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProjectRequestDto {
  @ApiPropertyOptional({
    description: 'Mensagem livre do cliente sobre o que ele precisa.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message: 'A mensagem deve ter no máximo 2000 caracteres.',
  })
  message?: string;
}
