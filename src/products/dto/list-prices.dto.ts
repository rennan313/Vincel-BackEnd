import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';

export class ListPricesDto {
  @ApiPropertyOptional({ description: 'Filtra o histórico por fornecedor.' })
  @IsOptional()
  @IsMongoId()
  supplierId?: string;
}
