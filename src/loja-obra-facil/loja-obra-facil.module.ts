import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LojaObraFacilController } from './loja-obra-facil.controller';
import { LojaObraFacilService } from './loja-obra-facil.service';

@Module({
  imports: [AuthModule],
  controllers: [LojaObraFacilController],
  providers: [LojaObraFacilService],
})
export class LojaObraFacilModule {}
