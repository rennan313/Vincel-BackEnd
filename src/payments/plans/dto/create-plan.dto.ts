import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'Pro' })
  @IsString()
  @MinLength(1, { message: 'Informe o nome do plano.' })
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 199.9,
    description: 'Valor mensal cobrado após o trial, em BRL.',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'O preço não pode ser negativo.' })
  price: number;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  trialDays?: number;
}
