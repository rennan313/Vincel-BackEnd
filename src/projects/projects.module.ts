import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectPdfService } from './project-pdf.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [AuthModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectPdfService],
})
export class ProjectsModule {}
