import { ApiProperty } from '@nestjs/swagger';
import { CompanyDocumentType } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class CompleteGoogleRegistrationDto {
  @ApiProperty({
    description:
      'Token retornado por GET /auth/google/callback quando a conta ainda não existe.',
  })
  @IsString()
  pendingToken: string;

  @ApiProperty({
    example: '12.345.678/0001-90',
    description: 'CNPJ ou CPF do escritório.',
  })
  @IsString()
  @MinLength(1, { message: 'Informe o CNPJ ou CPF do escritório.' })
  companyDocument: string;

  @ApiProperty({ enum: CompanyDocumentType, example: CompanyDocumentType.CNPJ })
  @IsEnum(CompanyDocumentType, {
    message: 'Informe se o documento é CNPJ ou CPF.',
  })
  companyDocumentType: CompanyDocumentType;
}
