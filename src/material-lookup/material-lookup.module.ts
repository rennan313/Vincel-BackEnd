import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MaterialLookupController } from './material-lookup.controller';
import { MaterialLookupService } from './material-lookup.service';

@Module({
  imports: [AuthModule],
  controllers: [MaterialLookupController],
  providers: [MaterialLookupService],
})
export class MaterialLookupModule {}
