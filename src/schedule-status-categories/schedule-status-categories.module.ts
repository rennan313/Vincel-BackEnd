import { Module } from '@nestjs/common';
import { ScheduleStatusCategoriesController } from './schedule-status-categories.controller';
import { ScheduleStatusCategoriesService } from './schedule-status-categories.service';

@Module({
  controllers: [ScheduleStatusCategoriesController],
  providers: [ScheduleStatusCategoriesService],
})
export class ScheduleStatusCategoriesModule {}
