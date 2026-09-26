import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PaymentStatus,
  UserRole,
  type Project,
  type ProjectExpense,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ProjectExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(currentUser: AuthenticatedUser, projectId: string) {
    await this.assertProjectScoped(currentUser, projectId);
    return this.prisma.projectExpense.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(
    currentUser: AuthenticatedUser,
    projectId: string,
    dto: CreateExpenseDto,
  ) {
    await this.assertProjectScoped(currentUser, projectId);
    return this.prisma.projectExpense.create({
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
        projectId,
      },
    });
  }

  async update(
    currentUser: AuthenticatedUser,
    projectId: string,
    expenseId: string,
    dto: UpdateExpenseDto,
  ) {
    await this.assertExpenseScoped(currentUser, projectId, expenseId);

    // Same auto-set/clear-on-status-change convenience as
    // ProjectsService.updateInstallmentStatus — an explicit paidAt in the
    // body still wins, so this never fights a caller that sets it itself.
    const paidAt =
      dto.paidAt !== undefined
        ? dto.paidAt
          ? new Date(dto.paidAt)
          : null
        : dto.status === PaymentStatus.PAID
          ? new Date()
          : dto.status === PaymentStatus.PENDING
            ? null
            : undefined;

    // undefined (not sent) leaves the field untouched; null explicitly
    // clears it — same distinction paidAt above already makes.
    const dueDate =
      dto.dueDate === undefined
        ? undefined
        : dto.dueDate
          ? new Date(dto.dueDate)
          : null;

    return this.prisma.projectExpense.update({
      where: { id: expenseId },
      data: { ...dto, dueDate, paidAt },
    });
  }

  async remove(
    currentUser: AuthenticatedUser,
    projectId: string,
    expenseId: string,
  ) {
    await this.assertExpenseScoped(currentUser, projectId, expenseId);
    await this.prisma.projectExpense.delete({ where: { id: expenseId } });
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

  private async assertExpenseScoped(
    currentUser: AuthenticatedUser,
    projectId: string,
    expenseId: string,
  ): Promise<ProjectExpense> {
    await this.assertProjectScoped(currentUser, projectId);
    const expense = await this.prisma.projectExpense.findUnique({
      where: { id: expenseId },
    });
    if (!expense || expense.projectId !== projectId) {
      throw new NotFoundException('Custo não encontrado neste projeto.');
    }
    return expense;
  }
}
