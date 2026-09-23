import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAgendaTaskDto {
  @ApiProperty({ example: 'Visita técnica ao terreno' })
  @IsString()
  @MinLength(1, { message: 'Informe o nome da tarefa.' })
  name: string;

  @ApiProperty({
    example: '2026-09-18',
    description:
      'Data (sem hora) para uma tarefa simples, ou um datetime ISO completo para o início de um compromisso.',
  })
  @IsDateString({}, { message: 'Informe uma data válida.' })
  date: string;

  @ApiPropertyOptional({
    example: '2026-09-18T14:00:00.000Z',
    description:
      'Datetime ISO de término — só para um compromisso (tem horário). Ausente => é uma tarefa simples.',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Informe um horário de término válido.' })
  endDate?: string;

  @ApiPropertyOptional({ description: 'Responsável — pelo compromisso ou pela tarefa.' })
  @IsOptional()
  @IsMongoId()
  assigneeUserId?: string;

  @ApiPropertyOptional({
    example: 'Levar as plantas atualizadas e confirmar acesso à obra.',
    description: 'Notas livres — para o compromisso ou para a tarefa.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Os detalhes devem ter no máximo 2000 caracteres.' })
  details?: string;

  @ApiPropertyOptional({
    description:
      'Obrigatório apenas para VINCEL_ADMIN — demais usuários criam sempre dentro do próprio escritório.',
  })
  @IsOptional()
  @IsMongoId()
  companyId?: string;
}
