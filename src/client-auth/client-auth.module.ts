import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectBriefingModule } from '../project-briefing/project-briefing.module';
import { ClientAuthController } from './client-auth.controller';
import { ClientAuthService } from './client-auth.service';
import { ClientJwtStrategy } from './strategies/client-jwt.strategy';

@Module({
  // Reuses AuthModule's already-configured JwtModule (same JWT_SECRET) —
  // client tokens carry `type: 'client'` instead of a separate secret to
  // keep the two kinds from being interchangeable (see ClientJwtStrategy).
  // ProjectBriefingModule lets the controller read/submit the briefing for
  // the client's own linked project through ProjectBriefingService.
  imports: [AuthModule, ProjectBriefingModule],
  controllers: [ClientAuthController],
  providers: [ClientAuthService, ClientJwtStrategy],
})
export class ClientAuthModule {}
