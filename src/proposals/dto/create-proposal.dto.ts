import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Complexity, FeeModel, PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProjectInstallmentDto } from '../../projects/dto/project-installment.dto';

// Campos de escopo/financeiro espelham CreateProjectDto de propósito — ao
// aceitar a proposta eles viram o Project sem redigitação (ver
// ProposalsService.updateStatus). Sem status/planningPhases/address: a
// proposta nasce sempre DRAFT e não carrega cronograma/endereço de obra —
// isso só existe quando o Project já existe.
export class CreateProposalDto {
  @ApiPropertyOptional({
    description: 'Preenchido quando o cliente foi selecionado da lista.',
  })
  @IsOptional()
  @IsMongoId()
  clientId?: string;

  @ApiProperty({ example: 'Ana Beatriz Ferreira' })
  @IsString()
  @MinLength(1, { message: 'Informe o nome do cliente.' })
  clientName: string;

  @ApiPropertyOptional({
    description:
      'ProjectRequest de origem, quando a proposta nasce de uma solicitação do portal.',
  })
  @IsOptional()
  @IsMongoId()
  projectRequestId?: string;

  @ApiProperty({ example: 'Residência Alto da Serra' })
  @IsString()
  @MinLength(1, { message: 'Informe o nome.' })
  name: string;

  @ApiProperty({ example: 'Residencial' })
  @IsString()
  @MinLength(1, { message: 'Informe o tipo.' })
  type: string;

  @ApiPropertyOptional({
    description: 'Preenchido quando type é o item "outro" do catálogo.',
  })
  @IsOptional()
  @IsString()
  customType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  areaSqm?: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'ServiceKey[] do front.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  services?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customServiceLabel?: string;

  @ApiPropertyOptional({ enum: Complexity })
  @IsOptional()
  @IsEnum(Complexity, { message: 'Complexidade inválida.' })
  complexity?: Complexity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  constructionBudget?: number;

  @ApiPropertyOptional({ enum: FeeModel })
  @IsOptional()
  @IsEnum(FeeModel, { message: 'Modelo de honorários inválido.' })
  feeModel?: FeeModel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  feeRate?: number;

  @ApiPropertyOptional({
    description: 'Só relevante quando feeModel é per_hour.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  feeAmount?: number;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'Forma de pagamento inválida.' })
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ type: [ProjectInstallmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectInstallmentDto)
  installments?: ProjectInstallmentDto[];

  @ApiPropertyOptional({
    description: 'Texto livre descrevendo o que está sendo proposto.',
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({
    description: 'Notas internas, não visíveis ao cliente.',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Data ISO (yyyy-mm-dd) até quando a proposta vale.',
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({
    description:
      'Obrigatório apenas para VINCEL_ADMIN — demais usuários criam sempre dentro do próprio escritório.',
  })
  @IsOptional()
  @IsMongoId()
  companyId?: string;
}
