import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProviderRole, ProviderStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsMongoId, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Either links an already-cadastrado provider (providerId set — the search
 * picker's normal path) or cadastros a brand-new one in the same call (no
 * providerId — the picker's "cadastrar novo prestador" fallback). name/role
 * are only required in the latter case, enforced in the service since
 * class-validator can't express "required unless providerId is set".
 */
export class AssignProviderDto {
  @ApiPropertyOptional({
    description: 'Id de um prestador já cadastrado no escritório, para apenas vincular.',
  })
  @IsOptional()
  @IsMongoId()
  providerId?: string;

  @ApiPropertyOptional({ example: 'Carlos Henrique' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Informe o nome.' })
  name?: string;

  @ApiPropertyOptional({ enum: ProviderRole, example: ProviderRole.ELETRICISTA })
  @IsOptional()
  @IsEnum(ProviderRole, { message: 'Participação inválida.' })
  role?: ProviderRole;

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

  @ApiPropertyOptional({ description: 'Razão social, se o prestador for uma empresa.' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: 'CPF ou CNPJ.' })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional({
    description: 'O que esse prestador é responsável a fazer neste projeto.',
  })
  @IsOptional()
  @IsString()
  responsibility?: string;

  @ApiPropertyOptional({
    enum: ProviderStatus,
    default: ProviderStatus.A_CONTRATAR,
  })
  @IsOptional()
  @IsEnum(ProviderStatus, { message: 'Status inválido.' })
  status?: ProviderStatus;
}
