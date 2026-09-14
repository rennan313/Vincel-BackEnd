import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import sharp from 'sharp';
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

// Logos are shown at small sizes (sidebar, invite page header) but kept at
// this canvas so they stay crisp on retina displays too — never upscaled
// past whatever was actually uploaded (see withoutEnlargement below).
const LOGO_MAX_DIMENSION = 512;
const ALLOWED_LOGO_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

@Injectable()
export class CompaniesService {
  private readonly storage = new Storage();
  private readonly bucketName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.bucketName = this.config.getOrThrow<string>('GCS_DOCUMENTS_BUCKET');
  }

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
        address: dto.address,
      },
    });
  }

  private logoStorageKey(companyId: string): string {
    // Fixed per company — a re-upload just overwrites this same object, so
    // there's never an orphaned old logo to separately clean up.
    return `companies/${companyId}/logo.png`;
  }

  /**
   * Resizes the upload server-side instead of trusting a pasted URL: caps
   * the canvas so oversized originals don't bloat storage/bandwidth, but
   * never enlarges a small one (that would just soften it, not sharpen it).
   * Always re-encoded to PNG so the storage key/content-type stay fixed
   * regardless of what format was uploaded.
   */
  async uploadLogo(
    currentUser: AuthenticatedUser,
    file: Express.Multer.File | undefined,
    origin: string,
  ) {
    if (!file) {
      throw new BadRequestException('Envie um arquivo de imagem.');
    }
    if (!ALLOWED_LOGO_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Formato inválido — envie um PNG, JPEG ou WEBP.',
      );
    }

    const company = await this.findOwn(currentUser);

    const resized = await sharp(file.buffer)
      .resize(LOGO_MAX_DIMENSION, LOGO_MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();

    const storageKey = this.logoStorageKey(company.id);
    await this.storage.bucket(this.bucketName).file(storageKey).save(resized, {
      contentType: 'image/png',
      resumable: false,
    });

    const logoUrl = `${origin}/companies/${company.id}/logo?v=${Date.now()}`;
    return this.prisma.company.update({
      where: { id: company.id },
      data: { logoUrl },
    });
  }

  async removeLogo(currentUser: AuthenticatedUser) {
    const company = await this.findOwn(currentUser);

    await this.storage
      .bucket(this.bucketName)
      .file(this.logoStorageKey(company.id))
      .delete({ ignoreNotFound: true });

    return this.prisma.company.update({
      where: { id: company.id },
      data: { logoUrl: null },
    });
  }

  /** Backs the public GET /companies/:id/logo — no auth, so 404s the same
   * way for "no such company" and "company has no logo" alike. */
  async getLogoStream(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company || company.deletedAt || !company.logoUrl) {
      throw new NotFoundException('Logo não encontrado.');
    }

    const file = this.storage
      .bucket(this.bucketName)
      .file(this.logoStorageKey(id));
    return { stream: file.createReadStream() };
  }
}
