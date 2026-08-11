import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'Projeto executivo' })
  @IsString()
  @MinLength(1, { message: 'Informe o nome.' })
  name: string;
}
