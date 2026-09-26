import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ListPayablesDto {
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
    description: 'Busca por nome do custo, projeto ou cliente.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus, { message: 'Status inválido.' })
  status?: PaymentStatus;

  @ApiPropertyOptional({
    description:
      'Obrigatório apenas para VINCEL_ADMIN — demais usuários são escopados pelo próprio token.',
  })
  @IsOptional()
  @IsMongoId()
  companyId?: string;

  // Só a string literal "true" — não existe filtro pro caso contrário (a
  // aba A Pagar sem esse parâmetro já mostra tudo, recorrente ou não), e
  // isso evita a pegadinha de "false" boolean-coerced de uma query string
  // (Boolean('false') é true).
  @ApiPropertyOptional({
    enum: ['true'],
    description:
      'Quando "true", filtra só despesas recorrentes (contas fixas — aba Contas Fixas do Financeiro).',
  })
  @IsOptional()
  @IsIn(['true'])
  recurring?: 'true';
}
