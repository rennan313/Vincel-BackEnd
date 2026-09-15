import { PartialType } from '@nestjs/swagger';
import { CreateScheduleStatusCategoryDto } from './create-schedule-status-category.dto';

export class UpdateScheduleStatusCategoryDto extends PartialType(
  CreateScheduleStatusCategoryDto,
) {}
