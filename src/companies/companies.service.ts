import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { resolveCompanyId } from '../common/company-scope';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

export interface CompanyPublicProfile {
  id: string;
  name: string;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Only the safe subset a public visitor should see (no document/CNPJ/
   * address) — backs the client-invite page, which has no authenticated
   * user to scope the request through.
   */
  async getPublicProfile(id: string): Promise<CompanyPublicProfile> {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company || company.deletedAt) {
      throw new NotFoundException('Escritório não encontrado.');
    }

    return {
      id: company.id,
      name: company.name,
      logoUrl: company.logoUrl,
      contactEmail: company.contactEmail,
      contactPhone: company.contactPhone,
    };
  }

  private async findOwn(currentUser: AuthenticatedUser) {
    const companyId = resolveCompanyId(currentUser);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company || company.deletedAt) {
      throw new NotFoundException('Escritório não encontrado.');
    }
    return company;
  }

  /** Full profile of the caller's own escritório — everything editable via
   * `updateOwnProfile`, plus document/documentType (read-only here). */
  async getOwnProfile(currentUser: AuthenticatedUser) {
    return this.findOwn(currentUser);
  }

  async updateOwnProfile(
    currentUser: AuthenticatedUser,
    dto: UpdateCompanyDto,
  ) {
    const company = await this.findOwn(currentUser);

    return this.prisma.company.update({
      where: { id: company.id },
      data: {
        name: dto.name,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        logoUrl: dto.logoUrl,
        address: dto.address,
      },
    });
  }
}
