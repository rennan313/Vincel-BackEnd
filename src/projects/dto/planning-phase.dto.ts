import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class PlanningPhaseDto {
  @ApiProperty({
    description: 'ServiceKey do front (ex.: "estudo_preliminar").',
  })
  @IsString()
  @MinLength(1)
  key: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  estimatedDays: number;
}
