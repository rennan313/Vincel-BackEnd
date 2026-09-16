import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgendaTasksModule } from './agenda-tasks/agenda-tasks.module';
import { AuthModule } from './auth/auth.module';
import { ClientAuthModule } from './client-auth/client-auth.module';
import { ClientsModule } from './clients/clients.module';
import { CompaniesModule } from './companies/companies.module';
import { LeroyMerlinModule } from './leroy-merlin/leroy-merlin.module';
import { LojaObraFacilModule } from './loja-obra-facil/loja-obra-facil.module';
import { MaterialLookupModule } from './material-lookup/material-lookup.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { ProjectDocumentsModule } from './project-documents/project-documents.module';
import { ProjectBriefingModule } from './project-briefing/project-briefing.module';
import { ProjectExpensesModule } from './project-expenses/project-expenses.module';
import { ProjectMaterialsModule } from './project-materials/project-materials.module';
import { ProjectProvidersModule } from './project-providers/project-providers.module';
import { ProjectTypesModule } from './project-types/project-types.module';
import { ProjectsModule } from './projects/projects.module';
import { ProvidersModule } from './providers/providers.module';
import { ScheduleStatusCategoriesModule } from './schedule-status-categories/schedule-status-categories.module';
import { ServicesModule } from './services/services.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { TelhaNorteModule } from './telha-norte/telha-norte.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ClientAuthModule,
    UsersModule,
    ClientsModule,
    CompaniesModule,
    ProjectTypesModule,
    ProjectsModule,
    ProvidersModule,
    ProjectProvidersModule,
    ProjectMaterialsModule,
    ProjectExpensesModule,
    ProjectDocumentsModule,
    ProjectBriefingModule,
    ServicesModule,
    SuppliersModule,
    ProductsModule,
    MaterialLookupModule,
    TelhaNorteModule,
    LeroyMerlinModule,
    LojaObraFacilModule,
    PaymentsModule,
    AgendaTasksModule,
    TimeEntriesModule,
    ScheduleStatusCategoriesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
