import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProviderRole } from '@prisma/client';
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
