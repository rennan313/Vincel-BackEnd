import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectComponentsController } from './project-components.controller';
import { ProjectComponentsService } from './project-components.service';

@Module({
  imports: [AuthModule],
  controllers: [ProjectComponentsController],
  providers: [ProjectComponentsService],
})
export class ProjectComponentsModule {}
