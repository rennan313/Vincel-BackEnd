import { Module } from '@nestjs/common';
import { CompaniesModule } from '../companies/companies.module';
import { ProjectBriefingController } from './project-briefing.controller';
import { ProjectBriefingService } from './project-briefing.service';

@Module({
  imports: [CompaniesModule],
  controllers: [ProjectBriefingController],
  providers: [ProjectBriefingService],
})
export class ProjectBriefingModule {}
