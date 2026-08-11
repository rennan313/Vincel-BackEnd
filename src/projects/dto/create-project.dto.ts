import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';
import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'Residência Alto da Serra' })
  @IsString()
  @MinLength(1, { message: 'Informe o nome.' })
  name: string;

  @ApiProperty({ example: 'Residencial' })
  @IsString()
  @MinLength(1, { message: 'Informe o tipo.' })
  type: string;

  @ApiPropertyOptional({
    enum: ProjectStatus,
    default: ProjectStatus.in_progress,
  })
  @IsOptional()
  @IsEnum(ProjectStatus, { message: 'Status inválido.' })
  status?: ProjectStatus;

  @ApiPropertyOptional({
    description:
      'Preenchido quando o cliente foi selecionado da lista de clientes.',
  })
  @IsOptional()
  @IsMongoId()
  clientId?: string;

  @ApiProperty({ example: 'Ana Beatriz Ferreira' })
  @IsString()
  @MinLength(1, { message: 'Informe o nome do cliente.' })
  clientName: string;

  @ApiPropertyOptional({
    description:
      'Obrigatório apenas para VINCEL_ADMIN — demais usuários criam sempre dentro do próprio escritório.',
  })
  @IsOptional()
  @IsMongoId()
  companyId?: string;
}
