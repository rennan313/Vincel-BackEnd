import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsMongoId } from 'class-validator';

export class CheckPublicClientEmailDto {
  @ApiProperty({
    description: 'Escritório (Company) em que o e-mail será verificado.',
  })
  @IsMongoId({ message: 'Informe um companyId válido.' })
  companyId: string;

  @ApiProperty({ example: 'ana.ferreira@email.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;
}
