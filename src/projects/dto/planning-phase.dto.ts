import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class PlanningPhaseDto {
  @ApiProperty({
    description:
      'ServiceKey do front para uma fase do catálogo, ou um id gerado para um item customizado.',
  })
  @IsString()
  @MinLength(1)
  key: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  estimatedDays: number;

  @ApiPropertyOptional({
    description:
      'Data ISO (yyyy-mm-dd) de início da tarefa. Término previsto é derivado no front a partir desta data + estimatedDays.',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Equipe responsável pela execução da tarefa.' })
  @IsOptional()
  @IsString()
  team?: string;
}
