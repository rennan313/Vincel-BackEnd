import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TelhaNorteController } from './telha-norte.controller';
import { TelhaNorteService } from './telha-norte.service';

@Module({
  imports: [AuthModule],
  controllers: [TelhaNorteController],
  providers: [TelhaNorteService],
})
export class TelhaNorteModule {}
