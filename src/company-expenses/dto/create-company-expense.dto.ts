import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCompanyExpenseDto {
  @ApiProperty({ example: 'Aluguel do escritório' })
  @IsString()
  @MinLength(1, { message: 'Informe o custo.' })
  name: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description:
      'Data ISO (yyyy-mm-dd) de vencimento — envie null para limpar.',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional({ enum: PaymentStatus, default: PaymentStatus.PENDING })
  @IsOptional()
  @IsEnum(PaymentStatus, { message: 'Status inválido.' })
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Setado quando status é PAID.' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({
    default: false,
    description:
      'Ao marcar esta ocorrência como paga, gera automaticamente a do mês seguinte.',
  })
  @IsOptional()
  @IsBoolean()
  recurring?: boolean;
}
