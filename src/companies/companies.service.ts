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
import { DEFAULT_BRIEFING_QUESTIONS } from './default-briefing-questions';
import { BriefingTemplateDto } from './dto/briefing-template.dto';
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

  /** Ensures the company has its (always-present, undeletable) default
   * template, creating it — seeded with the built-in defaults, same as
   * before this became template-based — the first time any of this
   * company's templates are fetched with none saved yet. */
  private async ensureDefaultTemplate(companyId: string) {
    const existing = await this.prisma.briefingTemplate.findFirst({
      where: { companyId, isDefault: true },
    });
    if (existing) return existing;

    const created = await this.prisma.briefingTemplate.create({
      data: { companyId, name: 'Padrão', projectTypes: [], isDefault: true },
    });
    await this.prisma.briefingQuestion.createMany({
      data: DEFAULT_BRIEFING_QUESTIONS.map((question, index) => ({
        ...question,
        templateId: created.id,
        order: index,
      })),
    });
    return created;
  }

  /** Every template of the caller's own company, questions included,
   * ordered so the default template is always last. Creates the default
   * template first if this company has none yet. */
  async listOwnBriefingTemplates(currentUser: AuthenticatedUser) {
    const companyId = resolveCompanyId(currentUser);
    await this.ensureDefaultTemplate(companyId);
    const templates = await this.prisma.briefingTemplate.findMany({
      where: { companyId },
      include: { questions: { orderBy: { order: 'asc' } } },
      orderBy: [{ isDefault: 'asc' }, { createdAt: 'asc' }],
    });
    return templates;
  }

  /** Resolves which template governs a given project type: the one
   * non-default template explicitly claiming it, or the company's
   * default template as fallback. Every project type belongs to exactly
   * one template at a time (enforced in upsertOwnBriefingTemplate), so
   * this is never ambiguous. */
  async resolveTemplateForType(companyId: string, projectType: string) {
    const specific = await this.prisma.briefingTemplate.findFirst({
      where: {
        companyId,
        isDefault: false,
        projectTypes: { has: projectType },
      },
    });
    if (specific) return specific;
    return this.ensureDefaultTemplate(companyId);
  }

  /** The questions of whichever template governs `projectType`, ordered —
   * used both by the admin's Configurações screen (via a specific
   * template id already in hand) and, via (companyId, projectType), by
   * the public briefing page (ProjectBriefingService has no authenticated
   * user to resolve a companyId/template from directly). */
  async listBriefingQuestions(companyId: string, projectType: string) {
    const template = await this.resolveTemplateForType(companyId, projectType);
    return this.prisma.briefingQuestion.findMany({
      where: { templateId: template.id },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Creates a new (never-default) template, or replaces an existing one
   * in place — name, assigned project types, and its whole question list
   * together. Existing questions keep their id (so past answers — which
   * reference questionId, not a label snapshot — stay attached) and are
   * updated in place; questions with no id are new; any existing question
   * missing from the incoming list is deleted (orphaning its past
   * answers, which is the point of deleting a question).
   *
   * A project type can only ever belong to one template: assigning it
   * here silently un-assigns it from whichever other non-default template
   * had it (the default template's projectTypes is always kept empty —
   * it's a pure fallback, not itself assignable).
   */
  async upsertOwnBriefingTemplate(
    currentUser: AuthenticatedUser,
    templateId: string | undefined,
    dto: BriefingTemplateDto,
  ) {
    const companyId = resolveCompanyId(currentUser);
    await this.ensureDefaultTemplate(companyId);

    let template = templateId
      ? await this.prisma.briefingTemplate.findFirst({
          where: { id: templateId, companyId },
        })
      : null;
    if (templateId && !template) {
      throw new NotFoundException('Template não encontrado.');
    }

    const isDefault = template?.isDefault ?? false;
    const projectTypes = isDefault ? [] : dto.projectTypes;

    if (projectTypes.length > 0) {
      await this.stealProjectTypes(
        companyId,
        template?.id ?? null,
        projectTypes,
      );
    }

    template = template
      ? await this.prisma.briefingTemplate.update({
          where: { id: template.id },
          data: { name: dto.name, projectTypes },
        })
      : await this.prisma.briefingTemplate.create({
          data: { companyId, name: dto.name, projectTypes, isDefault: false },
        });

    await this.replaceTemplateQuestions(template.id, dto.questions);

    return this.prisma.briefingTemplate.findUniqueOrThrow({
      where: { id: template.id },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  /** Removes `projectTypes` from every other non-default template of this
   * company so at most one template ever claims a given type. */
  private async stealProjectTypes(
    companyId: string,
    keepTemplateId: string | null,
    projectTypes: string[],
  ) {
    const conflicting = await this.prisma.briefingTemplate.findMany({
      where: {
        companyId,
        isDefault: false,
        id: keepTemplateId ? { not: keepTemplateId } : undefined,
        projectTypes: { hasSome: projectTypes },
      },
    });
    await Promise.all(
      conflicting.map((other) =>
        this.prisma.briefingTemplate.update({
          where: { id: other.id },
          data: {
            projectTypes: other.projectTypes.filter(
              (type) => !projectTypes.includes(type),
            ),
          },
        }),
      ),
    );
  }

  private async replaceTemplateQuestions(
    templateId: string,
    questions: BriefingTemplateDto['questions'],
  ) {
    const existingIds = new Set(
      (
        await this.prisma.briefingQuestion.findMany({
          where: { templateId },
          select: { id: true },
        })
      ).map((question) => question.id),
    );

    for (const question of questions) {
      if (question.id && !existingIds.has(question.id)) {
        throw new BadRequestException('Pergunta não encontrada.');
      }
    }

    const incomingIds = new Set(
      questions
        .filter((question) => question.id)
        .map((question) => question.id!),
    );
    const idsToDelete = [...existingIds].filter((id) => !incomingIds.has(id));

    await this.prisma.$transaction([
      ...(idsToDelete.length > 0
        ? [
            this.prisma.briefingQuestion.deleteMany({
              where: { id: { in: idsToDelete } },
            }),
          ]
        : []),
      ...questions.map((question, index) =>
        question.id
          ? this.prisma.briefingQuestion.update({
              where: { id: question.id },
              data: {
                section: question.section,
                label: question.label,
                type: question.type,
                order: index,
              },
            })
          : this.prisma.briefingQuestion.create({
              data: {
                templateId,
                section: question.section,
                label: question.label,
                type: question.type,
                order: index,
              },
            }),
      ),
    ]);
  }

  /** Deletes a non-default template — its types simply fall back to the
   * default template (resolveTemplateForType's fallback), no explicit
   * reassignment needed. The default template itself can never be
   * deleted. */
  async deleteOwnBriefingTemplate(
    currentUser: AuthenticatedUser,
    templateId: string,
  ) {
    const companyId = resolveCompanyId(currentUser);
    const template = await this.prisma.briefingTemplate.findFirst({
      where: { id: templateId, companyId },
    });
    if (!template) {
      throw new NotFoundException('Template não encontrado.');
    }
    if (template.isDefault) {
      throw new BadRequestException('O template padrão não pode ser excluído.');
    }

    await this.prisma.$transaction([
      this.prisma.briefingQuestion.deleteMany({ where: { templateId } }),
      this.prisma.briefingTemplate.delete({ where: { id: templateId } }),
    ]);
  }
}
