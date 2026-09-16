import { Module } from '@nestjs/common';
import { ProjectRequestsController } from './project-requests.controller';
import { ProjectRequestsService } from './project-requests.service';

@Module({
  controllers: [ProjectRequestsController],
  providers: [ProjectRequestsService],
})
export class ProjectRequestsModule {}
