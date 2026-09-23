import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProposalStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProposalStatusDto {
  @ApiProperty({ enum: ProposalStatus })
  @IsEnum(ProposalStatus, { message: 'Status inválido.' })
  status: ProposalStatus;

  @ApiPropertyOptional({
    description:
      'Anotação livre sobre esta mudança de status, guardada no histórico.',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Obrigatório quando status é REJECTED.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Informe o motivo da recusa.' })
  rejectionReason?: string;
}
