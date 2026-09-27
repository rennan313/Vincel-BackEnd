import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ExpenseCategory,
  PaymentStatus,
  RecurringFrequency,
} from '@prisma/client';
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

  @ApiPropertyOptional({ enum: ExpenseCategory })
  @IsOptional()
  @IsEnum(ExpenseCategory, { message: 'Categoria inválida.' })
  category?: ExpenseCategory;

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
      'Ao marcar esta ocorrência como paga, gera automaticamente a próxima (deslocada por recurringFrequency).',
  })
  @IsOptional()
  @IsBoolean()
  recurring?: boolean;

  @ApiPropertyOptional({
    enum: RecurringFrequency,
    default: RecurringFrequency.monthly,
    description:
      'Só relevante quando recurring é true. Sem valor, a próxima ocorrência é gerada como se fosse "monthly".',
  })
  @IsOptional()
  @IsEnum(RecurringFrequency, {
    message: 'Frequência de recorrência inválida.',
  })
  recurringFrequency?: RecurringFrequency;

  @ApiPropertyOptional({
    default: false,
    description:
      'Exclui este lançamento da média mensal por categoria (FinancialService.categorySpend) — pra um gasto pontual/fora do padrão não distorcer a média.',
  })
  @IsOptional()
  @IsBoolean()
  excludeFromAverage?: boolean;
}
