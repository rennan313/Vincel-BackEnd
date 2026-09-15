import { ApiProperty } from '@nestjs/swagger';
import { IsHexColor, IsInt, IsString, MinLength } from 'class-validator';

export class CreateScheduleStatusCategoryDto {
  @ApiProperty({ example: 'No prazo' })
  @IsString()
  @MinLength(1, { message: 'Informe o nome da categoria.' })
  label: string;

  @ApiProperty({ example: '#22c55e', description: 'Cor em hexadecimal.' })
  @IsHexColor({ message: 'Informe uma cor válida (ex: #22c55e).' })
  color: string;

  @ApiProperty({
    example: 0,
    description:
      'Dias de atraso a partir dos quais esta categoria passa a valer (0 ou negativo = dentro do prazo).',
  })
  @IsInt({ message: 'Informe um número inteiro de dias.' })
  thresholdDays: number;
}
