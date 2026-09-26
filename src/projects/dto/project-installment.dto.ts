import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class ProjectInstallmentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  id: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  label: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Data ISO (yyyy-mm-dd) de vencimento.' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ enum: PaymentStatus, default: PaymentStatus.PENDING })
  @IsOptional()
  @IsEnum(PaymentStatus, { message: 'Status inválido.' })
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Setado quando status é PAID.' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
