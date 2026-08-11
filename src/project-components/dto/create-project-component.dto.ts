import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateProjectComponentDto {
  @ApiProperty({ example: 'Sala de estar' })
  @IsString()
  @MinLength(1, { message: 'Informe o nome.' })
  name: string;

  @ApiPropertyOptional({
    example: 'Características do imóvel',
    description: 'Grupo de exibição — omitido para itens "mais usados".',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Exibido na lista de "mais usados".',
  })
  @IsOptional()
  @IsBoolean()
  mostUsed?: boolean;
}
