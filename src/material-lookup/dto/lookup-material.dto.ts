import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';

export class LookupMaterialDto {
  @ApiProperty({ example: 'https://www.leroymerlin.com.br/produto/123' })
  @IsUrl({}, { message: 'Informe uma URL válida.' })
  url: string;
}
