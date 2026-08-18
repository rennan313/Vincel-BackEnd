import { PartialType } from '@nestjs/swagger';
import { AssignProviderDto } from './assign-provider.dto';

export class UpdateProjectProviderDto extends PartialType(AssignProviderDto) {}
