import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectExpensesController } from './project-expenses.controller';
import { ProjectExpensesService } from './project-expenses.service';

@Module({
  imports: [AuthModule],
  controllers: [ProjectExpensesController],
  providers: [ProjectExpensesService],
})
export class ProjectExpensesModule {}
