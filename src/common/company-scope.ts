import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

/**
 * Every tenant-owned record is scoped by companyId. Regular users are
 * always scoped to their own token's companyId — they never pass one
 * explicitly. VINCEL_ADMIN has no company of its own and must pass the
 * target companyId explicitly on every request that needs one.
 */
export function resolveCompanyId(
  currentUser: AuthenticatedUser,
  requestedCompanyId?: string,
): string {
  if (currentUser.role === UserRole.VINCEL_ADMIN) {
    if (!requestedCompanyId) {
      throw new BadRequestException('Informe o companyId.');
    }
    return requestedCompanyId;
  }

  if (!currentUser.companyId) {
    throw new ForbiddenException('Usuário sem escritório associado.');
  }
  return currentUser.companyId;
}
