import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class PhaseTaskDto {
  @ApiProperty({ description: 'Gerado no front, como PlanningPhase.key.' })
  @IsString()
  @MinLength(1)
  id: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsBoolean()
  done: boolean;

  @ApiProperty({ description: 'Data ISO de criação da task.' })
  @IsDateString()
  createdAt: string;
}
