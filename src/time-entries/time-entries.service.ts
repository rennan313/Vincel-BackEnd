import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TimeEntry } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { resolveCompanyId } from '../common/company-scope';
import { PrismaService } from '../prisma/prisma.service';
import { ListTimeEntriesDto } from './dto/list-time-entries.dto';
import { StartTimeEntryDto } from './dto/start-time-entry.dto';

const PROJECT_SELECT = { project: { select: { id: true, name: true } } };

@Injectable()
export class TimeEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getActive(currentUser: AuthenticatedUser) {
    return this.prisma.timeEntry.findFirst({
      where: { userId: currentUser.id, endedAt: null, deletedAt: null },
      include: PROJECT_SELECT,
    });
  }

  async list(currentUser: AuthenticatedUser, query: ListTimeEntriesDto) {
    const date = query.date ?? new Date().toISOString().slice(0, 10);
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    return this.prisma.timeEntry.findMany({
      where: {
        userId: currentUser.id,
        deletedAt: null,
        startedAt: { gte: dayStart, lte: dayEnd },
      },
      include: PROJECT_SELECT,
      orderBy: { startedAt: 'asc' },
    });
  }

  async start(currentUser: AuthenticatedUser, dto: StartTimeEntryDto) {
    const companyId = resolveCompanyId(currentUser);

    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });
    if (!project || project.deletedAt || project.companyId !== companyId) {
      throw new NotFoundException('Projeto não encontrado.');
    }

    // Only one running timer per user — whatever was active gets closed out
    // first, same as clicking "Parar" on it.
    const existing = await this.prisma.timeEntry.findFirst({
      where: { userId: currentUser.id, endedAt: null, deletedAt: null },
    });
    if (existing) {
      await this.finalizeStop(existing);
    }

    return this.prisma.timeEntry.create({
      data: {
        activity: dto.activity,
        projectId: dto.projectId,
        userId: currentUser.id,
        companyId,
        startedAt: new Date(),
        endedAt: null,
        pausedAt: null,
        deletedAt: null,
      },
      include: PROJECT_SELECT,
    });
  }

  async pause(currentUser: AuthenticatedUser, id: string) {
    const entry = await this.findOwned(currentUser, id);
    if (entry.endedAt) {
      throw new BadRequestException('Essa atividade já foi encerrada.');
    }
    if (entry.pausedAt) return this.withProject(entry);

    return this.prisma.timeEntry.update({
      where: { id },
      data: { pausedAt: new Date() },
      include: PROJECT_SELECT,
    });
  }

  async resume(currentUser: AuthenticatedUser, id: string) {
    const entry = await this.findOwned(currentUser, id);
    if (entry.endedAt) {
      throw new BadRequestException('Essa atividade já foi encerrada.');
    }
    if (!entry.pausedAt) return this.withProject(entry);

    const pausedMs = entry.pausedMs + (Date.now() - entry.pausedAt.getTime());
    return this.prisma.timeEntry.update({
      where: { id },
      data: { pausedMs, pausedAt: null },
      include: PROJECT_SELECT,
    });
  }

  async stop(currentUser: AuthenticatedUser, id: string) {
    const entry = await this.findOwned(currentUser, id);
    if (entry.endedAt) return this.withProject(entry);
    return this.finalizeStop(entry);
  }

  private async finalizeStop(entry: TimeEntry) {
    const now = new Date();
    const pausedMs = entry.pausedAt
      ? entry.pausedMs + (now.getTime() - entry.pausedAt.getTime())
      : entry.pausedMs;

    return this.prisma.timeEntry.update({
      where: { id: entry.id },
      data: { endedAt: now, pausedMs, pausedAt: null },
      include: PROJECT_SELECT,
    });
  }

  private withProject(entry: TimeEntry) {
    return this.prisma.timeEntry.findUniqueOrThrow({
      where: { id: entry.id },
      include: PROJECT_SELECT,
    });
  }

  private async findOwned(
    currentUser: AuthenticatedUser,
    id: string,
  ): Promise<TimeEntry> {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!entry || entry.deletedAt || entry.userId !== currentUser.id) {
      throw new NotFoundException('Atividade não encontrada.');
    }
    return entry;
  }
}
