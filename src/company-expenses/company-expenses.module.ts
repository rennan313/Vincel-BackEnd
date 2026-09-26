import { Module } from '@nestjs/common';
import { CompanyExpensesController } from './company-expenses.controller';
import { CompanyExpensesService } from './company-expenses.service';

@Module({
  controllers: [CompanyExpensesController],
  providers: [CompanyExpensesService],
})
export class CompanyExpensesModule {}
