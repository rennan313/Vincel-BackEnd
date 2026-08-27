import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProviderDto } from './create-provider.dto';

export class UpdateProviderDto extends PartialType(
  OmitType(CreateProviderDto, ['companyId'] as const),
) {}
