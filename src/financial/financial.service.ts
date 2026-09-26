import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { resolveCompanyId } from '../common/company-scope';
import { PrismaService } from '../prisma/prisma.service';
import { ListPayablesDto } from './dto/list-payables.dto';
import { ListReceivablesDto } from './dto/list-receivables.dto';

export interface ReceivableRow {
  projectId: string;
  projectName: string;
  clientName: string;
  installmentId: string;
  label: string;
  amount: number;
  dueDate: Date | null;
  status: PaymentStatus;
  paidAt: Date | null;
}

export interface PayableRow {
  kind: 'project' | 'company';
  expenseId: string;
  projectId: string | null;
  projectName: string | null;
  clientName: string | null;
  name: string;
  amount: number;
  dueDate: Date | null;
  status: PaymentStatus;
  paidAt: Date | null;
  recurring: boolean;
}

@Injectable()
export class FinancialService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Plain sums/counts, same honest style as DashboardService.summary — no
   * derived score, just what's pendente/atrasado right now. "Atrasado" is
   * never a stored status, only PENDING + a dueDate already in the past.
   */
  async summary(currentUser: AuthenticatedUser) {
    const companyId = resolveCompanyId(currentUser);
    const today = new Date();

    const [
      projects,
      projectExpensePendingAgg,
      projectExpenseOverdueCount,
      companyExpensePendingAgg,
      companyExpenseOverdueCount,
    ] = await Promise.all([
      this.prisma.project.findMany({
        where: { companyId, deletedAt: null },
        select: { installments: true },
      }),
      this.prisma.projectExpense.aggregate({
        where: {
          project: { companyId, deletedAt: null },
          status: PaymentStatus.PENDING,
        },
        _sum: { amount: true },
      }),
      this.prisma.projectExpense.count({
        where: {
          project: { companyId, deletedAt: null },
          status: PaymentStatus.PENDING,
          dueDate: { lt: today },
        },
      }),
      this.prisma.companyExpense.aggregate({
        where: { companyId, status: PaymentStatus.PENDING },
        _sum: { amount: true },
      }),
      this.prisma.companyExpense.count({
        where: {
          companyId,
          status: PaymentStatus.PENDING,
          dueDate: { lt: today },
        },
      }),
    ]);

    const pendingInstallments = projects
      .flatMap((project) => project.installments ?? [])
      .filter((installment) => installment.status === PaymentStatus.PENDING);

    const receivablePending = pendingInstallments.reduce(
      (sum, installment) => sum + installment.amount,
      0,
    );
    const receivableOverdueCount = pendingInstallments.filter(
      (installment) => installment.dueDate && installment.dueDate < today,
    ).length;

    return {
      receivablePending,
      receivableOverdueCount,
      payablePending:
        (projectExpensePendingAgg._sum.amount ?? 0) +
        (companyExpensePendingAgg._sum.amount ?? 0),
      payableOverdueCount:
        projectExpenseOverdueCount + companyExpenseOverdueCount,
    };
  }

  /**
   * Honorário installments are embedded per-Project, not their own
   * collection — flattening/filtering/paginating happens here, in memory,
   * across the company's (small) project list, rather than a Mongo
   * aggregation pipeline. Fine at this scale (see FinancialModule's plan).
   */
  async receivables(currentUser: AuthenticatedUser, query: ListReceivablesDto) {
    const companyId = resolveCompanyId(currentUser, query.companyId);
    const projects = await this.prisma.project.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true, name: true, clientName: true, installments: true },
    });

    let rows: ReceivableRow[] = projects.flatMap((project) =>
      (project.installments ?? []).map((installment) => ({
        projectId: project.id,
        projectName: project.name,
        clientName: project.clientName,
        installmentId: installment.id,
        label: installment.label,
        amount: installment.amount,
        dueDate: installment.dueDate ?? null,
        status: installment.status,
        paidAt: installment.paidAt ?? null,
      })),
    );

    if (query.status) {
      rows = rows.filter((row) => row.status === query.status);
    }
    if (query.search) {
      const search = query.search.toLowerCase();
      rows = rows.filter(
        (row) =>
          row.projectName.toLowerCase().includes(search) ||
          row.clientName.toLowerCase().includes(search) ||
          row.label.toLowerCase().includes(search),
      );
    }

    // Vencimento mais próximo primeiro — sem data vai pro fim, não pro
    // início (é o que faz sentido numa lista de "a receber").
    rows.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });

    const total = rows.length;
    const start = (query.page - 1) * query.pageSize;
    const data = rows.slice(start, start + query.pageSize);

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  /** "A pagar" juntando duas fontes bem diferentes — despesas de projeto
   * (ProjectExpense, ligadas a um Project) e despesas do escritório
   * (CompanyExpense, sem projeto nenhum) — a pessoa que gerencia o
   * financeiro não deveria precisar saber qual é qual pra ver tudo numa
   * lista só. Sem uma coleção única pras duas, o filtro/ordenação/
   * paginação acontece em memória aqui, mesmo raciocínio de escala já
   * usado em receivables (poucas dezenas de linhas numa empresa pequena).
   */
  async payables(currentUser: AuthenticatedUser, query: ListPayablesDto) {
    const companyId = resolveCompanyId(currentUser, query.companyId);

    const [projectExpenses, companyExpenses] = await Promise.all([
      this.prisma.projectExpense.findMany({
        where: { project: { companyId, deletedAt: null } },
        include: { project: { select: { name: true, clientName: true } } },
      }),
      this.prisma.companyExpense.findMany({ where: { companyId } }),
    ]);

    let rows: PayableRow[] = [
      ...projectExpenses.map((row): PayableRow => ({
        kind: 'project',
        expenseId: row.id,
        projectId: row.projectId,
        projectName: row.project.name,
        clientName: row.project.clientName,
        name: row.name,
        amount: row.amount,
        dueDate: row.dueDate,
        status: row.status,
        paidAt: row.paidAt,
        recurring: false,
      })),
      ...companyExpenses.map((row): PayableRow => ({
        kind: 'company',
        expenseId: row.id,
        projectId: null,
        projectName: null,
        clientName: null,
        name: row.name,
        amount: row.amount,
        dueDate: row.dueDate,
        status: row.status,
        paidAt: row.paidAt,
        recurring: row.recurring,
      })),
    ];

    if (query.status) {
      rows = rows.filter((row) => row.status === query.status);
    }
    if (query.search) {
      const search = query.search.toLowerCase();
      rows = rows.filter(
        (row) =>
          row.name.toLowerCase().includes(search) ||
          (row.projectName?.toLowerCase().includes(search) ?? false) ||
          (row.clientName?.toLowerCase().includes(search) ?? false),
      );
    }

    // Vencimento mais próximo primeiro — sem data vai pro fim (mesma regra
    // de receivables).
    rows.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });

    const total = rows.length;
    const start = (query.page - 1) * query.pageSize;
    const data = rows.slice(start, start + query.pageSize);

    return { data, total, page: query.page, pageSize: query.pageSize };
  }
}
