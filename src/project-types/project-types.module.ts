import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectTypesController } from './project-types.controller';
import { ProjectTypesService } from './project-types.service';

@Module({
  imports: [AuthModule],
  controllers: [ProjectTypesController],
  providers: [ProjectTypesService],
})
export class ProjectTypesModule {}
