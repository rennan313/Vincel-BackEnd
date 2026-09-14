import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CompanyAddressDto } from './company-address.dto';

export class UpdateCompanyDto {
  @ApiPropertyOptional({ example: 'Estúdio Vincel Arquitetura' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Informe o nome.' })
  name?: string;

  @ApiPropertyOptional({ example: 'contato@estudiovincel.com.br' })
  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  contactEmail?: string;

  @ApiPropertyOptional({ example: '(11) 3456-7890' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'URL do logo, já hospedado.' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ type: CompanyAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CompanyAddressDto)
  address?: CompanyAddressDto;
}
