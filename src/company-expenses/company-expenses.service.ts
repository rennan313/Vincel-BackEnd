import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PaymentStatus,
  Prisma,
  UserRole,
  type CompanyExpense,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { resolveCompanyId } from '../common/company-scope';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyExpenseDto } from './dto/create-company-expense.dto';
import { ListCompanyExpensesDto } from './dto/list-company-expenses.dto';
import { UpdateCompanyExpenseDto } from './dto/update-company-expense.dto';

@Injectable()
export class CompanyExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(currentUser: AuthenticatedUser, query: ListCompanyExpensesDto) {
    const companyId = resolveCompanyId(currentUser, query.companyId);
    const where: Prisma.CompanyExpenseWhereInput = {
      companyId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.companyExpense.findMany({
        where,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.companyExpense.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async create(currentUser: AuthenticatedUser, dto: CreateCompanyExpenseDto) {
    const companyId = resolveCompanyId(currentUser);
    return this.prisma.companyExpense.create({
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
        companyId,
      },
    });
  }

  async update(
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateCompanyExpenseDto,
  ) {
    const existing = await this.assertScoped(currentUser, id);

    // Mesma convenção auto-set/clear de paidAt que ProjectExpensesService
    // já usa: um paidAt explícito no corpo sempre vence; senão, deriva da
    // transição de status.
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

    const dueDate =
      dto.dueDate === undefined
        ? undefined
        : dto.dueDate
          ? new Date(dto.dueDate)
          : null;

    const updated = await this.prisma.companyExpense.update({
      where: { id },
      data: { ...dto, dueDate, paidAt },
    });

    // Gera a próxima ocorrência só na TRANSIÇÃO pra PAID (nunca se já
    // estava paga) — evita duplicar se a tela salvar de novo sem trocar o
    // status.
    const justPaid =
      dto.status === PaymentStatus.PAID &&
      existing.status !== PaymentStatus.PAID;
    if (justPaid && updated.recurring) {
      const nextDueDate = updated.dueDate
        ? new Date(updated.dueDate)
        : new Date();
      nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + 1);
      await this.prisma.companyExpense.create({
        data: {
          companyId: updated.companyId,
          name: updated.name,
          amount: updated.amount,
          notes: updated.notes,
          dueDate: nextDueDate,
          status: PaymentStatus.PENDING,
          recurring: true,
        },
      });
    }

    return updated;
  }

  async remove(currentUser: AuthenticatedUser, id: string) {
    await this.assertScoped(currentUser, id);
    await this.prisma.companyExpense.delete({ where: { id } });
  }

  private async assertScoped(
    currentUser: AuthenticatedUser,
    id: string,
  ): Promise<CompanyExpense> {
    const expense = await this.prisma.companyExpense.findUnique({
      where: { id },
    });
    if (!expense) {
      throw new NotFoundException('Custo não encontrado.');
    }
    if (
      currentUser.role !== UserRole.VINCEL_ADMIN &&
      expense.companyId !== currentUser.companyId
    ) {
      throw new NotFoundException('Custo não encontrado.');
    }
    return expense;
  }
}
