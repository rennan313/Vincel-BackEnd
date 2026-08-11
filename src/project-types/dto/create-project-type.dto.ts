import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateProjectTypeDto {
  @ApiProperty({ example: 'Residencial' })
  @IsString()
  @MinLength(1, { message: 'Informe o nome.' })
  name: string;

  @ApiProperty({
    example: 'Home',
    description: 'Nome do ícone (lucide-react).',
  })
  @IsString()
  @MinLength(1, { message: 'Informe o ícone.' })
  icon: string;
}
