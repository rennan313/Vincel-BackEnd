import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';
import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: 'Residência Alto da Serra' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Informe o nome.' })
  name?: string;

  @ApiPropertyOptional({ example: 'Residencial' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Informe o tipo.' })
  type?: string;

  @ApiPropertyOptional({ enum: ProjectStatus })
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

  @ApiPropertyOptional({ example: 'Ana Beatriz Ferreira' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Informe o nome do cliente.' })
  clientName?: string;
}
