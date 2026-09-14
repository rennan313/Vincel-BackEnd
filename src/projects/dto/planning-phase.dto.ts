import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
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
    description: 'Data ISO (yyyy-mm-dd) de início da tarefa.',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description:
      'Data ISO (yyyy-mm-dd) de término previsto. Por padrão é startDate + estimatedDays, mas pode ser sobrescrita para refletir atraso/adiantamento.',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Equipe responsável pela execução da tarefa.',
  })
  @IsOptional()
  @IsString()
  team?: string;

  @ApiPropertyOptional({ description: 'Quantas horas essa etapa deve levar.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @ApiPropertyOptional({
    description:
      'Quantas horas já foram trabalhadas nessa etapa — hoje editável manualmente; futuramente também alimentado por um timer.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  loggedHours?: number;
}
