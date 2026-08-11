import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Cerâmica Portobello' })
  @IsString()
  @MinLength(1, { message: 'Informe o nome.' })
  name: string;
}
