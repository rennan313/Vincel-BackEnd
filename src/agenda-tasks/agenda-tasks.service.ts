import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole, type AgendaTask } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { resolveCompanyId } from '../common/company-scope';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAgendaTaskDto } from './dto/create-agenda-task.dto';
import { ListAgendaTasksDto } from './dto/list-agenda-tasks.dto';

@Injectable()
export class AgendaTasksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(currentUser: AuthenticatedUser, query: ListAgendaTasksDto) {
    const companyId = resolveCompanyId(currentUser, query.companyId);
    // Filters on the start `date` only — fine for a compromisso, which is
    // always same-day (start/end share a date). One that crossed midnight
    // would be missed if its start falls just before `from`; accepted
    // limitation, not worth an `endDate` filter for that edge case.
    const where: Prisma.AgendaTaskWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to
                ? { lte: new Date(`${query.to}T23:59:59.999Z`) }
                : {}),
            },
          }
        : {}),
    };

    return this.prisma.agendaTask.findMany({ where, orderBy: { date: 'asc' } });
  }

  async create(currentUser: AuthenticatedUser, dto: CreateAgendaTaskDto) {
    const companyId = resolveCompanyId(currentUser, dto.companyId);
    const date = new Date(dto.date);

    let endDate: Date | null = null;
    if (dto.endDate) {
      endDate = new Date(dto.endDate);
      if (endDate <= date) {
        throw new BadRequestException(
          'O horário de término deve ser depois do início.',
        );
      }
    }

    let assigneeUserId: string | null = null;
    if (dto.assigneeUserId) {
      const assignee = await this.prisma.user.findFirst({
        where: { id: dto.assigneeUserId, companyId, active: true },
        select: { id: true },
      });
      if (!assignee) {
        throw new BadRequestException('Responsável inválido.');
      }
      assigneeUserId = assignee.id;
    }

    return this.prisma.agendaTask.create({
      data: {
        name: dto.name,
        date,
        endDate,
        details: dto.details ?? null,
        assigneeUserId,
        companyId,
        deletedAt: null,
      },
    });
  }

  async remove(currentUser: AuthenticatedUser, id: string) {
    await this.findScoped(currentUser, id);
    return this.prisma.agendaTask.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async findScoped(
    currentUser: AuthenticatedUser,
    id: string,
  ): Promise<AgendaTask> {
    const task = await this.prisma.agendaTask.findUnique({ where: { id } });
    if (!task || task.deletedAt) {
      throw new NotFoundException('Tarefa não encontrada.');
    }
    if (
      currentUser.role !== UserRole.VINCEL_ADMIN &&
      task.companyId !== currentUser.companyId
    ) {
      throw new NotFoundException('Tarefa não encontrada.');
    }
    return task;
  }
}
