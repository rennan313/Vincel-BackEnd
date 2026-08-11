import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClientType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ClientAddressDto } from './client-address.dto';

export class CreateClientDto {
  @ApiProperty({ example: 'Ana Beatriz Ferreira' })
  @IsString()
  @MinLength(1, { message: 'Informe o nome.' })
  name: string;

  @ApiProperty({ example: 'ana.ferreira@email.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  @ApiProperty({ example: '(11) 98221-3344' })
  @IsString()
  @MinLength(1, { message: 'Informe o telefone.' })
  phone: string;

  @ApiProperty({ enum: ClientType, example: ClientType.PF })
  @IsEnum(ClientType, { message: 'Tipo inválido.' })
  type: ClientType;

  @ApiPropertyOptional({ description: 'CPF ou CNPJ, conforme o tipo.' })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional({ type: ClientAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ClientAddressDto)
  address?: ClientAddressDto;

  @ApiPropertyOptional({
    description:
      'Obrigatório apenas para VINCEL_ADMIN — demais usuários criam sempre dentro do próprio escritório.',
  })
  @IsOptional()
  @IsMongoId()
  companyId?: string;
}
