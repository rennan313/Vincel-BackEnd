import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

// Ambos opcionais — a tela de Financeiro usa isto tanto pra marcar
// pago/pendente quanto pra só editar o vencimento, sem precisar mandar o
// outro campo junto.
export class UpdateInstallmentStatusDto {
  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus, { message: 'Status inválido.' })
  status?: PaymentStatus;

  @ApiPropertyOptional({
    description:
      'Data ISO (yyyy-mm-dd) de vencimento — envie null para limpar.',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}
