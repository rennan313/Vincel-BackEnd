import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const FILTERABLE_ROLES = [
  UserRole.ADMIN,
  UserRole.ARCHITECT,
  UserRole.FINANCE,
  UserRole.CUSTOMER,
] as const;

export class ListUsersDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ApiPropertyOptional({ description: 'Busca por nome ou e-mail.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Obrigatório apenas para VINCEL_ADMIN — demais usuários são escopados pelo próprio token.',
  })
  @IsOptional()
  @IsMongoId()
  companyId?: string;

  @ApiPropertyOptional({
    enum: FILTERABLE_ROLES,
    description: 'Filtra por perfil.',
  })
  @IsOptional()
  @IsIn(FILTERABLE_ROLES, { message: 'Perfil inválido.' })
  role?: (typeof FILTERABLE_ROLES)[number];
}
