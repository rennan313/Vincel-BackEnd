import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsEmail,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

const ASSIGNABLE_ROLES = [
  UserRole.ADMIN,
  UserRole.ARCHITECT,
  UserRole.FINANCE,
  UserRole.CUSTOMER,
] as const;

export class CreateUserDto {
  @ApiProperty({ example: 'Bruno Souza' })
  @IsString()
  @MinLength(2, { message: 'Informe o nome completo.' })
  name: string;

  @ApiProperty({ example: 'bruno@escritorio.com.br' })
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

  @ApiProperty({ enum: ASSIGNABLE_ROLES, example: UserRole.ARCHITECT })
  @IsIn(ASSIGNABLE_ROLES, { message: 'Perfil inválido.' })
  role: (typeof ASSIGNABLE_ROLES)[number];

  @ApiPropertyOptional({
    description:
      'Obrigatório apenas para VINCEL_ADMIN — demais usuários criam sempre dentro do próprio escritório.',
  })
  @IsOptional()
  @IsMongoId()
  companyId?: string;
}
