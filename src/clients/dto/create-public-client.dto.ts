import { ApiProperty } from '@nestjs/swagger';
import { ClientType } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsMongoId,
  IsString,
  MinLength,
} from 'class-validator';

export class CreatePublicClientDto {
  @ApiProperty({
    description: 'Escritório (Company) ao qual o cliente pertence.',
  })
  @IsMongoId({ message: 'Informe um companyId válido.' })
  companyId: string;

  @ApiProperty({ example: 'Ana Beatriz Ferreira' })
  @IsString()
  @MinLength(1, { message: 'Informe o nome.' })
  name: string;

  @ApiProperty({ example: 'ana.ferreira@email.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  @ApiProperty({ example: '(11) 98221-3344' })
  @IsString()
  @MinLength(1, { message: 'Informe o telefone.' })
  phone: string;

  @ApiProperty({ enum: ClientType, example: ClientType.PF })
  @IsEnum(ClientType, { message: 'Tipo inválido.' })
  type: ClientType;
}
