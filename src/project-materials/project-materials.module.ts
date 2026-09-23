import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectMaterialsController } from './project-materials.controller';
import { ProjectMaterialsService } from './project-materials.service';

@Module({
  imports: [AuthModule],
  controllers: [ProjectMaterialsController],
  providers: [ProjectMaterialsService],
  // Consumed by ClientAuthModule so the client portal can read its own
  // linked project's materials and approve them through the same service.
  exports: [ProjectMaterialsService],
})
export class ProjectMaterialsModule {}
