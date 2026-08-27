import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectMaterialsController } from './project-materials.controller';
import { ProjectMaterialsService } from './project-materials.service';

@Module({
  imports: [AuthModule],
  controllers: [ProjectMaterialsController],
  providers: [ProjectMaterialsService],
})
export class ProjectMaterialsModule {}
