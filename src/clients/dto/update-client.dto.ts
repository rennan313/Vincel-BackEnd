import { ApiPropertyOptional } from '@nestjs/swagger';
import { ClientType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
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

  @ApiPropertyOptional({
    minLength: 8,
    description:
      'Habilita (ou reseta) o login desse cliente no portal (client-auth) — mín. 8 caracteres, com maiúscula, minúscula e número.',
  })
  @IsOptional()
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres.' })
  @Matches(/[A-Z]/, {
    message: 'A senha deve conter ao menos uma letra maiúscula.',
  })
  @Matches(/[a-z]/, {
    message: 'A senha deve conter ao menos uma letra minúscula.',
  })
  @Matches(/[0-9]/, { message: 'A senha deve conter ao menos um número.' })
  password?: string;
}
