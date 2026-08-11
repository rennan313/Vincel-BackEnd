import { ApiPropertyOptional } from '@nestjs/swagger';
import { ClientType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ClientAddressDto } from './client-address.dto';

export class UpdateClientDto {
  @ApiPropertyOptional({ example: 'Ana Beatriz Ferreira' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Informe o nome.' })
  name?: string;

  @ApiPropertyOptional({ example: 'ana.ferreira@email.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email?: string;

  @ApiPropertyOptional({ example: '(11) 98221-3344' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Informe o telefone.' })
  phone?: string;

  @ApiPropertyOptional({ enum: ClientType })
  @IsOptional()
  @IsEnum(ClientType, { message: 'Tipo inválido.' })
  type?: ClientType;

  @ApiPropertyOptional({ description: 'CPF ou CNPJ, conforme o tipo.' })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional({ type: ClientAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ClientAddressDto)
  address?: ClientAddressDto;
}
