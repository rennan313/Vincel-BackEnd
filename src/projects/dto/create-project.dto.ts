import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Complexity,
  FeeModel,
  PaymentMethod,
  ProjectStatus,
} from '@prisma/client';
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
import { PlanningPhaseDto } from './planning-phase.dto';
import { ProjectAddressDto } from './project-address.dto';
import { ProjectComponentDto } from './project-component.dto';
import { ProjectInstallmentDto } from './project-installment.dto';
import { ProjectTeamMemberDto } from './project-team-member.dto';

export class CreateProjectDto {
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
    enum: ProjectStatus,
    default: ProjectStatus.in_progress,
  })
  @IsOptional()
  @IsEnum(ProjectStatus, { message: 'Status inválido.' })
  status?: ProjectStatus;

  @ApiPropertyOptional({
    description:
      'Preenchido quando o cliente foi selecionado da lista de clientes.',
  })
  @IsOptional()
  @IsMongoId()
  clientId?: string;

  @ApiProperty({ example: 'Ana Beatriz Ferreira' })
  @IsString()
  @MinLength(1, { message: 'Informe o nome do cliente.' })
  clientName: string;

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

  @ApiPropertyOptional({ type: [ProjectComponentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectComponentDto)
  components?: ProjectComponentDto[];

  @ApiPropertyOptional({ type: [PlanningPhaseDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanningPhaseDto)
  planningPhases?: PlanningPhaseDto[];

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

  @ApiPropertyOptional({ type: [ProjectTeamMemberDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectTeamMemberDto)
  teamMembers?: ProjectTeamMemberDto[];

  @ApiPropertyOptional({ description: 'Data ISO (yyyy-mm-dd).' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data ISO (yyyy-mm-dd).' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ type: ProjectAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectAddressDto)
  address?: ProjectAddressDto;

  @ApiPropertyOptional({
    description:
      'Obrigatório apenas para VINCEL_ADMIN — demais usuários criam sempre dentro do próprio escritório.',
  })
  @IsOptional()
  @IsMongoId()
  companyId?: string;
}
