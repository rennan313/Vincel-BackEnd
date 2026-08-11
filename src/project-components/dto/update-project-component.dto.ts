import { PartialType } from '@nestjs/swagger';
import { CreateProjectComponentDto } from './create-project-component.dto';

export class UpdateProjectComponentDto extends PartialType(
  CreateProjectComponentDto,
) {}
