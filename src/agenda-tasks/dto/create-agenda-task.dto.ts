import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateAgendaTaskDto {
  @ApiProperty({ example: 'Visita técnica ao terreno' })
  @IsString()
  @MinLength(1, { message: 'Informe o nome da tarefa.' })
  name: string;

  @ApiProperty({ example: '2026-09-18' })
  @IsDateString({}, { message: 'Informe uma data válida.' })
  date: string;

  @ApiPropertyOptional({
    description:
      'Obrigatório apenas para VINCEL_ADMIN — demais usuários criam sempre dentro do próprio escritório.',
  })
  @IsOptional()
  @IsMongoId()
  companyId?: string;
}
