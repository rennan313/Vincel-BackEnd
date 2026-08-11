import { ApiProperty } from '@nestjs/swagger';
import { CompanyDocumentType } from '@prisma/client';
import { IsEmail, IsEnum, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Ana Beatriz Ferreira' })
  @IsString()
  @MinLength(2, { message: 'Informe seu nome completo.' })
  name: string;

  @ApiProperty({ example: 'ana@escritorio.com.br' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  @ApiProperty({
    minLength: 8,
    description: 'Mín. 8 caracteres, com maiúscula, minúscula e número.',
  })
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres.' })
  @Matches(/[A-Z]/, {
    message: 'A senha deve conter ao menos uma letra maiúscula.',
  })
  @Matches(/[a-z]/, {
    message: 'A senha deve conter ao menos uma letra minúscula.',
  })
  @Matches(/[0-9]/, { message: 'A senha deve conter ao menos um número.' })
  password: string;

  @ApiProperty({
    example: '12.345.678/0001-90',
    description: 'CNPJ ou CPF do escritório.',
  })
  @IsString()
  @MinLength(1, { message: 'Informe o CNPJ ou CPF do escritório.' })
  companyDocument: string;

  @ApiProperty({ enum: CompanyDocumentType, example: CompanyDocumentType.CNPJ })
  @IsEnum(CompanyDocumentType, {
    message: 'Informe se o documento é CNPJ ou CPF.',
  })
  companyDocumentType: CompanyDocumentType;
}
