import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProjectTypeDto {
  @ApiPropertyOptional({ example: 'Residencial' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Informe o nome.' })
  name?: string;

  @ApiPropertyOptional({
    example: 'Home',
    description: 'Nome do ícone (lucide-react).',
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Informe o ícone.' })
  icon?: string;
}
