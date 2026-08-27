import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProviderRole, ProviderStatus } from '@prisma/client';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Either links an already-cadastrado provider (providerId set — the search
 * picker's normal path) or cadastros a brand-new one in the same call (no
 * providerId — the picker's "cadastrar novo prestador" fallback). name/role
 * are only required in the latter case, enforced in the service since
 * class-validator can't express "required unless providerId is set".
 */
export class AssignProviderDto {
  @ApiPropertyOptional({
    description:
      'Id de um prestador já cadastrado no escritório, para apenas vincular.',
  })
  @IsOptional()
  @IsMongoId()
  providerId?: string;

  @ApiPropertyOptional({ example: 'Carlos Henrique' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Informe o nome.' })
  name?: string;

  @ApiPropertyOptional({
    enum: ProviderRole,
    isArray: true,
    example: [ProviderRole.ELETRICISTA],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Informe ao menos uma participação.' })
  @ArrayUnique()
  @IsEnum(ProviderRole, { each: true, message: 'Participação inválida.' })
  role?: ProviderRole[];

  @ApiPropertyOptional({
    description: 'Preenchido quando role inclui OUTRO.',
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

  @ApiPropertyOptional({
    description: 'Valor combinado com este prestador para este projeto.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  agreedAmount?: number;

  @ApiPropertyOptional({
    description:
      'Peso (%) que a tarefa deste prestador representa na entrega do projeto.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  weight?: number;
}
