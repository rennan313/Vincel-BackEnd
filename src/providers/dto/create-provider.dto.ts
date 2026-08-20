import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProviderRole, ProviderStatus } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateProviderDto {
  @ApiProperty({ example: 'Carlos Henrique' })
  @IsString()
  @MinLength(1, { message: 'Informe o nome.' })
  name: string;

  @ApiProperty({ enum: ProviderRole, example: ProviderRole.ELETRICISTA })
  @IsEnum(ProviderRole, { message: 'Participação inválida.' })
  role: ProviderRole;

  @ApiPropertyOptional({
    description: 'Preenchido quando role é OUTRO.',
  })
  @IsOptional()
  @IsString()
  customRole?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Razão social, se o prestador for uma empresa.',
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: 'CPF ou CNPJ.' })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional({
    enum: ProviderStatus,
    default: ProviderStatus.A_CONTRATAR,
  })
  @IsOptional()
  @IsEnum(ProviderStatus, { message: 'Status inválido.' })
  status?: ProviderStatus;

  @ApiPropertyOptional({
    description:
      'Obrigatório apenas para VINCEL_ADMIN — demais usuários criam sempre dentro do próprio escritório.',
  })
  @IsOptional()
  @IsMongoId()
  companyId?: string;
}
