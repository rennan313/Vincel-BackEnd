import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsNumber,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'PORT-ACET-60X60' })
  @IsString()
  @MinLength(1, { message: 'Informe o SKU.' })
  sku: string;

  @ApiProperty({ example: 'Porcelanato acetinado 60x60' })
  @IsString()
  @MinLength(1, { message: 'Informe o nome.' })
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'm²' })
  @IsString()
  @MinLength(1, { message: 'Informe a unidade de medida.' })
  unit: string;

  @ApiPropertyOptional({ description: 'Peso em kg.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: 'URL da imagem do produto.' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ description: 'Largura em cm.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ description: 'Altura em cm.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ description: 'Profundidade em cm.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  depth?: number;

  @ApiPropertyOptional({ type: [String], example: ['Branco', 'Bege'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @ApiPropertyOptional({ example: 'Revestimentos' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    example: 'Telha Norte',
    description:
      'Fonte do catálogo (ex: parceiro de onde o produto veio). O mesmo sku pode se repetir entre fornecedores diferentes — a unicidade é pelo par (sku, supplier).',
  })
  @IsOptional()
  @IsString()
  supplier?: string;
}
