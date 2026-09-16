import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import sharp from 'sharp';
import { UserRole, type Project } from '@prisma/client';
import { CompaniesService } from '../companies/companies.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitProjectBriefingDto } from './dto/submit-project-briefing.dto';

// Documentation photos of furniture/items to keep — kept larger than the
// company logo (LOGO_MAX_DIMENSION = 512 in companies.service.ts) since
// these need enough resolution to actually judge condition/fit, but still
// capped so a phone's full-res photo doesn't balloon storage/bandwidth.
const PHOTO_MAX_DIMENSION = 1600;
const ALLOWED_PHOTO_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

@Injectable()
export class ProjectBriefingService {
  private readonly storage = new Storage();
  private readonly bucketName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly companiesService: CompaniesService,
    private readonly config: ConfigService,
  ) {
    this.bucketName = this.config.getOrThrow<string>('GCS_DOCUMENTS_BUCKET');
  }

  /** Backs the public briefing page — no authenticated user, so this
   * exposes only what a client filling out their own project's briefing
   * needs: the project/client names, the office's branding, its current
   * question list, and whatever they may have already answered (to
   * prefill a re-visit). */
  async getPublicContext(projectId: string) {
    const project = await this.findActiveProject(projectId);
    const [company, questions, briefing] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: project.companyId } }),
      this.companiesService.listBriefingQuestions(project.companyId),
      this.prisma.projectBriefing.findUnique({ where: { projectId } }),
    ]);

    return {
      project: {
        id: project.id,
        name: project.name,
        clientName: project.clientName,
      },
      company: { name: company?.name ?? '', logoUrl: company?.logoUrl ?? null },
      questions,
      briefing,
    };
  }

  async submitPublic(projectId: string, dto: SubmitProjectBriefingDto) {
    const project = await this.findActiveProject(projectId);

    // Answers for a question this company no longer has are dropped
    // rather than stored orphaned — the questionId came from the form the
    // client was just shown, but a submission racing an admin edit could
    // still carry a stale one.
    const validQuestionIds = new Set(
      (
        await this.companiesService.listBriefingQuestions(project.companyId)
      ).map((q) => q.id),
    );
    const answers = dto.answers
      .filter((answer) => validQuestionIds.has(answer.questionId))
      .map((answer) => ({
        questionId: answer.questionId,
        value: answer.value,
        values: answer.values ?? [],
      }));

    return this.prisma.projectBriefing.upsert({
      where: { projectId },
      create: { projectId, answers, submittedAt: new Date() },
      update: { answers, submittedAt: new Date() },
    });
  }

  private photoStorageKey(
    projectId: string,
    questionId: string,
    fileId: string,
  ): string {
    return `project-briefing/${projectId}/${questionId}/${fileId}.jpg`;
  }

  /**
   * Uploads one photo for a PHOTOS-type question — called once per file,
   * so the client can add/remove items one at a time before submitting.
   * The returned url is only wired into the answer once the form is
   * actually submitted (see submitPublic); an upload nobody submits is an
   * accepted orphaned-blob gap, same tradeoff as the company logo.
   */
  async uploadPublicPhoto(
    projectId: string,
    questionId: string | undefined,
    file: Express.Multer.File | undefined,
    origin: string,
  ) {
    if (!file) {
      throw new BadRequestException('Envie uma imagem.');
    }
    if (!ALLOWED_PHOTO_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Formato inválido — envie um PNG, JPEG ou WEBP.',
      );
    }
    if (!questionId) {
      throw new BadRequestException('Informe a pergunta (questionId).');
    }

    const project = await this.findActiveProject(projectId);
    const validQuestionIds = new Set(
      (
        await this.companiesService.listBriefingQuestions(project.companyId)
      ).map((q) => q.id),
    );
    if (!validQuestionIds.has(questionId)) {
      throw new BadRequestException('Pergunta inválida.');
    }

    const resized = await sharp(file.buffer)
      .resize(PHOTO_MAX_DIMENSION, PHOTO_MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82 })
      .toBuffer();

    const fileId = randomUUID();
    const storageKey = this.photoStorageKey(projectId, questionId, fileId);
    await this.storage.bucket(this.bucketName).file(storageKey).save(resized, {
      contentType: 'image/jpeg',
      resumable: false,
    });

    return {
      url: `${origin}/projects/${projectId}/briefing/photos/${questionId}/${fileId}`,
    };
  }

  async getPhotoStream(projectId: string, questionId: string, fileId: string) {
    const file = this.storage
      .bucket(this.bucketName)
      .file(this.photoStorageKey(projectId, questionId, fileId));
    const [exists] = await file.exists();
    if (!exists) {
      throw new NotFoundException('Foto não encontrada.');
    }
    return { stream: file.createReadStream() };
  }

  /** In-app read for the office — same company-scoping every other
   * project sub-resource uses. `briefing` is null (not 404) when the
   * project exists but the client hasn't submitted one yet. */
  async getForCompany(currentUser: AuthenticatedUser, projectId: string) {
    const project = await this.assertProjectScoped(currentUser, projectId);
    const [questions, briefing] = await Promise.all([
      this.companiesService.listBriefingQuestions(project.companyId),
      this.prisma.projectBriefing.findUnique({ where: { projectId } }),
    ]);
    return { questions, briefing };
  }

  private async findActiveProject(projectId: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.deletedAt) {
      throw new NotFoundException('Projeto não encontrado.');
    }
    return project;
  }

  private async assertProjectScoped(
    currentUser: AuthenticatedUser,
    projectId: string,
  ): Promise<Project> {
    const project = await this.findActiveProject(projectId);
    if (
      currentUser.role !== UserRole.VINCEL_ADMIN &&
      project.companyId !== currentUser.companyId
    ) {
      throw new NotFoundException('Projeto não encontrado.');
    }
    return project;
  }
}
