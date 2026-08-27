import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectProvidersController } from './project-providers.controller';
import { ProjectProvidersService } from './project-providers.service';

@Module({
  imports: [AuthModule],
  controllers: [ProjectProvidersController],
  providers: [ProjectProvidersService],
})
export class ProjectProvidersModule {}
