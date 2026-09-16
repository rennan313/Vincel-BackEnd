import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BriefingQuestionType } from '@prisma/client';
import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class BriefingQuestionDto {
  @ApiPropertyOptional({
    description:
      'Omitido para uma pergunta nova; presente para editar uma existente.',
  })
  @IsOptional()
  @IsMongoId()
  id?: string;

  @ApiProperty({ example: 'Sobre o uso' })
  @IsString()
  @MinLength(1, { message: 'Informe a seção.' })
  section: string;

  @ApiProperty({ example: 'Quantas pessoas vão usar o espaço?' })
  @IsString()
  @MinLength(1, { message: 'Informe a pergunta.' })
  label: string;

  @ApiProperty({ enum: BriefingQuestionType })
  @IsEnum(BriefingQuestionType, { message: 'Tipo inválido.' })
  type: BriefingQuestionType;
}
