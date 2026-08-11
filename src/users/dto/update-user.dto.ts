import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

const ASSIGNABLE_ROLES = [
  UserRole.ADMIN,
  UserRole.ARCHITECT,
  UserRole.FINANCE,
  UserRole.CUSTOMER,
] as const;

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Bruno Souza' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Informe o nome completo.' })
  name?: string;

  @ApiPropertyOptional({ example: 'bruno@escritorio.com.br' })
  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email?: string;

  @ApiPropertyOptional({ enum: ASSIGNABLE_ROLES })
  @IsOptional()
  @IsIn(ASSIGNABLE_ROLES, { message: 'Perfil inválido.' })
  role?: (typeof ASSIGNABLE_ROLES)[number];
}
