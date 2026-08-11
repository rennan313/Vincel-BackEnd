import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNumber, Min } from 'class-validator';

export class CreatePriceDto {
  @ApiProperty({ description: 'Id do fornecedor que pratica esse preço.' })
  @IsMongoId()
  supplierId: string;

  @ApiProperty({ example: 89.9 })
  @IsNumber()
  @Min(0, { message: 'O preço não pode ser negativo.' })
  price: number;
}
