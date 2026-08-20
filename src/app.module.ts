import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { MaterialLookupModule } from './material-lookup/material-lookup.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { ProjectMaterialsModule } from './project-materials/project-materials.module';
import { ProjectProvidersModule } from './project-providers/project-providers.module';
import { ProjectTypesModule } from './project-types/project-types.module';
import { ProjectsModule } from './projects/projects.module';
import { ProvidersModule } from './providers/providers.module';
import { ServicesModule } from './services/services.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { TelhaNorteModule } from './telha-norte/telha-norte.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    ProjectTypesModule,
    ProjectsModule,
    ProvidersModule,
    ProjectProvidersModule,
    ProjectMaterialsModule,
    ServicesModule,
    SuppliersModule,
    ProductsModule,
    MaterialLookupModule,
    TelhaNorteModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
