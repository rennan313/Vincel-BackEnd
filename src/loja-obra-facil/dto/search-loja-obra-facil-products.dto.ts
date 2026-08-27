import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SearchLojaObraFacilProductsDto {
  @ApiProperty({ example: 'CIMENTO' })
  @IsString()
  @MinLength(1, { message: 'Informe o termo de busca.' })
  query: string;
}
