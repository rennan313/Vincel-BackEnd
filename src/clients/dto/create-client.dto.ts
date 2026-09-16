import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClientType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
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
    minLength: 8,
    description:
      'Habilita o login desse cliente no portal (client-auth) — mín. 8 caracteres, com maiúscula, minúscula e número. Deixe em branco para não dar acesso ainda.',
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

  @ApiPropertyOptional({
    description:
      'Obrigatório apenas para VINCEL_ADMIN — demais usuários criam sempre dentro do próprio escritório.',
  })
  @IsOptional()
  @IsMongoId()
  companyId?: string;
}
