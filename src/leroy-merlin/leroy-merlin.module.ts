import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LeroyMerlinController } from './leroy-merlin.controller';
import { LeroyMerlinService } from './leroy-merlin.service';

@Module({
  imports: [AuthModule],
  controllers: [LeroyMerlinController],
  providers: [LeroyMerlinService],
})
export class LeroyMerlinModule {}
