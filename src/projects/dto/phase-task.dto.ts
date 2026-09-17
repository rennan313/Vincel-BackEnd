import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
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

  @ApiPropertyOptional({
    description:
      'User.id responsável por esta task — mostrado como um ponto colorido.',
  })
  @IsOptional()
  @IsMongoId()
  assigneeUserId?: string;

  @ApiPropertyOptional({
    description: 'Horas estimadas para esta task específica.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @ApiProperty({ description: 'Data ISO de criação da task.' })
  @IsDateString()
  createdAt: string;
}
