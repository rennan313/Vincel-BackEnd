import { Module } from '@nestjs/common';
import { CompaniesModule } from '../companies/companies.module';
import { ProjectBriefingController } from './project-briefing.controller';
import { ProjectBriefingService } from './project-briefing.service';

@Module({
  imports: [CompaniesModule],
  controllers: [ProjectBriefingController],
  providers: [ProjectBriefingService],
  // Consumed by ClientAuthModule so the client portal can read/submit the
  // briefing for its own linked project through the same service.
  exports: [ProjectBriefingService],
})
export class ProjectBriefingModule {}
