import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ example: 'Taxa de aprovação na prefeitura' })
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
}
