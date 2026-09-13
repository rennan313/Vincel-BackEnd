import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AgendaTasksController } from './agenda-tasks.controller';
import { AgendaTasksService } from './agenda-tasks.service';

@Module({
  imports: [AuthModule],
  controllers: [AgendaTasksController],
  providers: [AgendaTasksService],
})
export class AgendaTasksModule {}
