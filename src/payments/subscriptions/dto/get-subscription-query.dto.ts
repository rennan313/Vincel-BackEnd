import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';

export class GetSubscriptionQueryDto {
  @ApiPropertyOptional({
    description: 'Obrigatório para VINCEL_ADMIN — id do escritório.',
  })
  @IsOptional()
  @IsMongoId()
  companyId?: string;
}
