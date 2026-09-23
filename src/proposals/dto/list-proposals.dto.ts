import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProposalStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ListProposalsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ApiPropertyOptional({
    description: 'Busca por nome da proposta ou nome do cliente.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ProposalStatus,
    description: 'Filtra por status exato.',
  })
  @IsOptional()
  @IsEnum(ProposalStatus, { message: 'Status inválido.' })
  status?: ProposalStatus;

  @ApiPropertyOptional({ description: 'Filtra pelas propostas de um cliente.' })
  @IsOptional()
  @IsMongoId()
  clientId?: string;

  @ApiPropertyOptional({
    description:
      'Obrigatório apenas para VINCEL_ADMIN — demais usuários são escopados pelo próprio token.',
  })
  @IsOptional()
  @IsMongoId()
  companyId?: string;
}
