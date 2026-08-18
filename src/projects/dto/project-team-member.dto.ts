import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProviderRole, ProviderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class ProjectTeamMemberDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  id: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ enum: ProviderRole })
  @IsEnum(ProviderRole, { message: 'Participação inválida.' })
  role: ProviderRole;

  @ApiPropertyOptional({
    description: 'Preenchido quando role é OUTRO.',
  })
  @IsOptional()
  @IsString()
  customRole?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  document?: string;
}
