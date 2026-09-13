import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class ListTimeEntriesDto {
  @ApiPropertyOptional({
    description: 'Data (yyyy-mm-dd) a listar — padrão é hoje.',
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
