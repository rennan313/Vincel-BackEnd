import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectMaterialStatus } from '@prisma/client';
import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateMaterialDto {
  @ApiPropertyOptional({
    description: 'Set when cadastrado a partir do catálogo de produtos.',
  })
  @IsOptional()
  @IsMongoId()
  productId?: string;

  @ApiProperty({ example: 'Piso Vinílico Sofisticato Nogueira' })
  @IsString()
  @MinLength(1, { message: 'Informe o item.' })
  name: string;

  @ApiPropertyOptional({ example: 'Revestimentos' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Suíte' })
  @IsOptional()
  @IsString()
  room?: string;

  @ApiPropertyOptional({
    enum: ProjectMaterialStatus,
    default: ProjectMaterialStatus.A_DEFINIR,
  })
  @IsOptional()
  @IsEnum(ProjectMaterialStatus, { message: 'Status inválido.' })
  status?: ProjectMaterialStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ example: 'm²' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCost?: number;

  @ApiPropertyOptional({ example: 'Prime Revest' })
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: '2 mm' })
  @IsOptional()
  @IsString()
  thickness?: string;

  @ApiPropertyOptional({ example: '120 × 20 cm' })
  @IsOptional()
  @IsString()
  dimension?: string;

  @ApiPropertyOptional({ example: 'Madeirado' })
  @IsOptional()
  @IsString()
  finish?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'URL da imagem do material.' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ description: 'Link de referência do produto.' })
  @IsOptional()
  @IsString()
  referenceUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
