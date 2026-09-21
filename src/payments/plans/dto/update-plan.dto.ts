import { ApiPropertyOptional } from '@nestjs/swagger';
import { BillingInterval } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpdatePlanDto {
  @ApiPropertyOptional({ example: 'Pro' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Informe o nome do plano.' })
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 199.9,
    description:
      'Valor cobrado por ciclo de cobrança, em BRL (ver billingInterval).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'O preço não pode ser negativo.' })
  price?: number;

  @ApiPropertyOptional({
    enum: BillingInterval,
    description: 'Periodicidade da cobrança.',
  })
  @IsOptional()
  @IsEnum(BillingInterval, { message: 'Periodicidade de cobrança inválida.' })
  billingInterval?: BillingInterval;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  trialDays?: number;

  @ApiPropertyOptional({
    description:
      'Novas empresas são automaticamente colocadas em trial neste plano ao se cadastrar.',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
