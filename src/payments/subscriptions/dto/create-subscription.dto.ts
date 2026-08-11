import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AcquirerType } from '@prisma/client';
import { IsEnum, IsMongoId, IsOptional } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty()
  @IsMongoId()
  planId: string;

  @ApiPropertyOptional({
    enum: AcquirerType,
    description:
      'Obrigatório apenas se houver mais de um adquirente habilitado.',
  })
  @IsOptional()
  @IsEnum(AcquirerType)
  acquirer?: AcquirerType;

  @ApiPropertyOptional({
    description: 'Obrigatório para VINCEL_ADMIN — id do escritório a assinar.',
  })
  @IsOptional()
  @IsMongoId()
  companyId?: string;
}
