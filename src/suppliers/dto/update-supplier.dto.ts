import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSupplierDto {
  @ApiPropertyOptional({ example: 'Cerâmica Portobello' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Informe o nome.' })
  name?: string;
}
