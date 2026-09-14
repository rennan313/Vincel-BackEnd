import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { UserRole, type Project, type ProjectDocument } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

// Blocks obviously-dangerous file types — everything else (pdf, images,
// office docs, cad files, ...) is accepted, per the "vários formatos" ask.
const BLOCKED_EXTENSIONS = new Set([
  'exe',
  'bat',
  'cmd',
  'com',
  'msi',
  'sh',
  'bash',
  'ps1',
  'app',
  'apk',
  'dll',
  'scr',
  'jar',
  'js',
  'vbs',
  'wsf',
]);

function extensionOf(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex === -1 ? '' : fileName.slice(dotIndex + 1).toLowerCase();
}

@Injectable()
export class ProjectDocumentsService {
  private readonly storage = new Storage();
  private readonly bucketName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.bucketName = this.config.getOrThrow<string>('GCS_DOCUMENTS_BUCKET');
  }

  async list(currentUser: AuthenticatedUser, projectId: string) {
    await this.assertProjectScoped(currentUser, projectId);
    return this.prisma.projectDocument.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async upload(
    currentUser: AuthenticatedUser,
    projectId: string,
    file: Express.Multer.File,
    dto: CreateDocumentDto,
  ) {
    await this.assertProjectScoped(currentUser, projectId);

    const extension = extensionOf(file.originalname);
    if (BLOCKED_EXTENSIONS.has(extension)) {
      throw new BadRequestException(
        'Este tipo de arquivo não é permitido por segurança.',
      );
    }

    const storageKey = `projects/${projectId}/${randomUUID()}-${file.originalname}`;
    await this.storage
      .bucket(this.bucketName)
      .file(storageKey)
      .save(file.buffer, {
        contentType: file.mimetype || 'application/octet-stream',
        resumable: false,
      });

    return this.prisma.projectDocument.create({
      data: {
        projectId,
        name: dto.name,
        type: dto.type,
        notes: dto.notes,
        fileName: file.originalname,
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size,
        storageKey,
      },
    });
  }

  async update(
    currentUser: AuthenticatedUser,
    projectId: string,
    documentId: string,
    dto: UpdateDocumentDto,
  ) {
    await this.assertDocumentScoped(currentUser, projectId, documentId);
    return this.prisma.projectDocument.update({
      where: { id: documentId },
      data: dto,
    });
  }

  async getDownloadTarget(
    currentUser: AuthenticatedUser,
    projectId: string,
    documentId: string,
  ) {
    const document = await this.assertDocumentScoped(
      currentUser,
      projectId,
      documentId,
    );
    const file = this.storage.bucket(this.bucketName).file(document.storageKey);
    return { document, stream: file.createReadStream() };
  }

  async remove(
    currentUser: AuthenticatedUser,
    projectId: string,
    documentId: string,
  ) {
    const document = await this.assertDocumentScoped(
      currentUser,
      projectId,
      documentId,
    );
    await this.storage
      .bucket(this.bucketName)
      .file(document.storageKey)
      .delete({ ignoreNotFound: true });
    await this.prisma.projectDocument.delete({ where: { id: documentId } });
  }

  private async assertProjectScoped(
    currentUser: AuthenticatedUser,
    projectId: string,
  ): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.deletedAt) {
      throw new NotFoundException('Projeto não encontrado.');
    }
    if (
      currentUser.role !== UserRole.VINCEL_ADMIN &&
      project.companyId !== currentUser.companyId
    ) {
      throw new NotFoundException('Projeto não encontrado.');
    }
    return project;
  }

  private async assertDocumentScoped(
    currentUser: AuthenticatedUser,
    projectId: string,
    documentId: string,
  ): Promise<ProjectDocument> {
    await this.assertProjectScoped(currentUser, projectId);
    const document = await this.prisma.projectDocument.findUnique({
      where: { id: documentId },
    });
    if (!document || document.projectId !== projectId) {
      throw new NotFoundException('Documento não encontrado neste projeto.');
    }
    return document;
  }
}
