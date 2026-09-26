import { Injectable } from '@nestjs/common';
import {
  ExpenseCategory,
  PaymentMethod,
  PaymentStatus,
  RecurringFrequency,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { resolveCompanyId } from '../common/company-scope';
import { PrismaService } from '../prisma/prisma.service';
import { ListPayablesDto } from './dto/list-payables.dto';
import { ListReceivablesDto } from './dto/list-receivables.dto';

export interface ReceivableRow {
  projectId: string;
  projectName: string;
  clientName: string;
  // Forma de pagamento escolhida pro projeto inteiro (à vista/parcelado/por
  // etapa/mensal/personalizado) — não por parcela, todas as parcelas de um
  // mesmo projeto compartilham o mesmo valor aqui.
  paymentMethod: PaymentMethod | null;
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
  category: ExpenseCategory | null;
  dueDate: Date | null;
  status: PaymentStatus;
  paidAt: Date | null;
  recurring: boolean;
  // Só relevante quando recurring é true — null pra ProjectExpense (nunca
  // recorrente) e pra CompanyExpense recorrente criada antes desse campo
  // existir (tratada como "monthly" na leitura, nunca gravado).
  recurringFrequency: RecurringFrequency | null;
  // Exclui esta linha da média mensal por categoria (categorySpend) — nunca
  // afeta o valor em si, só essa agregação.
  excludeFromAverage: boolean;
}

export interface CashFlowMonth {
  month: string;
  receivables: number;
  payables: number;
}

export interface CashFlowResult {
  months: CashFlowMonth[];
  unscheduledReceivables: number;
  unscheduledPayables: number;
}

export interface CategorySpendRow {
  category: ExpenseCategory | null;
  total: number;
  average: number;
  count: number;
}

export interface CategorySpendResult {
  months: number;
  // Ordenadas desc por average — só categorias com pelo menos um
  // lançamento no período (nenhuma fatia zerada).
  rows: CategorySpendRow[];
}

// Quantos meses a projeção de fluxo de caixa olha pra frente (mês atual +
// os seguintes) — mesmo grão que DashboardService.charts usa pra trás.
const CASH_FLOW_MONTHS = 6;

// Quantos meses a média de gasto por categoria olha pra trás (mês atual +
// os anteriores) — mesmo grão que DashboardService.charts usa.
const CATEGORY_SPEND_MONTHS = 6;

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** O mês atual mais os próximos `count - 1`, como chaves 'YYYY-MM', mês
 * atual primeiro — o espelho de recentMonthKeys do dashboard.service.ts
 * (aquela olha pra trás, esta olha pra frente). Mantida local, não
 * importada de lá — pequena o bastante pra duplicar em vez de acoplar dois
 * módulos de domínio diferentes por uma única função de data. */
function upcomingMonthKeys(count: number): string[] {
  const keys: string[] = [];
  const cursor = new Date();
  cursor.setUTCDate(1);
  cursor.setUTCHours(0, 0, 0, 0);
  for (let i = 0; i < count; i += 1) {
    const d = new Date(cursor);
    d.setUTCMonth(d.getUTCMonth() + i);
    keys.push(monthKey(d));
  }
  return keys;
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
      select: {
        id: true,
        name: true,
        clientName: true,
        paymentMethod: true,
        installments: true,
      },
    });

    let rows: ReceivableRow[] = projects.flatMap((project) =>
      (project.installments ?? []).map((installment) => ({
        projectId: project.id,
        projectName: project.name,
        clientName: project.clientName,
        paymentMethod: project.paymentMethod,
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
        category: row.category,
        dueDate: row.dueDate,
        status: row.status,
        paidAt: row.paidAt,
        recurring: false,
        recurringFrequency: null,
        excludeFromAverage: row.excludeFromAverage,
      })),
      ...companyExpenses.map((row): PayableRow => ({
        kind: 'company',
        expenseId: row.id,
        projectId: null,
        projectName: null,
        clientName: null,
        name: row.name,
        amount: row.amount,
        category: row.category,
        dueDate: row.dueDate,
        status: row.status,
        paidAt: row.paidAt,
        recurring: row.recurring,
        recurringFrequency: row.recurringFrequency,
        excludeFromAverage: row.excludeFromAverage,
      })),
    ];

    if (query.status) {
      rows = rows.filter((row) => row.status === query.status);
    }
    if (query.recurring === 'true') {
      rows = rows.filter((row) => row.recurring);
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

  /**
   * Projeção de fluxo de caixa — quanto entra/sai por mês, mês atual + os
   * próximos CASH_FLOW_MONTHS-1. Só PENDING conta (PAID já aconteceu, não é
   * "projeção"); atrasado (dueDate no passado) cai no mês atual — não faz
   * sentido projetar um mês que já passou, é dinheiro ainda em aberto agora;
   * além da janela cai no último bucket, pra nenhum valor com data sumir da
   * soma. Sem dueDate não entra nos buckets (não dá pra posicionar na linha
   * do tempo) mas é somado à parte em unscheduled* — nunca escondido.
   */
  async cashFlow(currentUser: AuthenticatedUser): Promise<CashFlowResult> {
    const companyId = resolveCompanyId(currentUser);

    const [projects, projectExpenses, companyExpenses] = await Promise.all([
      this.prisma.project.findMany({
        where: { companyId, deletedAt: null },
        select: { installments: true },
      }),
      this.prisma.projectExpense.findMany({
        where: { project: { companyId, deletedAt: null } },
      }),
      this.prisma.companyExpense.findMany({ where: { companyId } }),
    ]);

    const monthKeys = upcomingMonthKeys(CASH_FLOW_MONTHS);
    const firstMonth = monthKeys[0];
    const lastMonth = monthKeys[monthKeys.length - 1];

    // Comparação lexicográfica funciona porque 'YYYY-MM' é zero-padded —
    // mesma ordem de uma comparação de data.
    function bucketFor(dueDate: Date): string {
      const key = monthKey(dueDate);
      if (key < firstMonth) return firstMonth;
      if (key > lastMonth) return lastMonth;
      return key;
    }

    const receivablesByMonth = new Map<string, number>();
    const payablesByMonth = new Map<string, number>();
    let unscheduledReceivables = 0;
    let unscheduledPayables = 0;

    for (const project of projects) {
      for (const installment of project.installments ?? []) {
        if (installment.status !== PaymentStatus.PENDING) continue;
        if (!installment.dueDate) {
          unscheduledReceivables += installment.amount;
          continue;
        }
        const bucket = bucketFor(installment.dueDate);
        receivablesByMonth.set(
          bucket,
          (receivablesByMonth.get(bucket) ?? 0) + installment.amount,
        );
      }
    }

    for (const expense of [...projectExpenses, ...companyExpenses]) {
      if (expense.status !== PaymentStatus.PENDING) continue;
      if (!expense.dueDate) {
        unscheduledPayables += expense.amount;
        continue;
      }
      const bucket = bucketFor(expense.dueDate);
      payablesByMonth.set(
        bucket,
        (payablesByMonth.get(bucket) ?? 0) + expense.amount,
      );
    }

    const months: CashFlowMonth[] = monthKeys.map((month) => ({
      month,
      receivables: receivablesByMonth.get(month) ?? 0,
      payables: payablesByMonth.get(month) ?? 0,
    }));

    return { months, unscheduledReceivables, unscheduledPayables };
  }

  /**
   * "Em que a empresa costuma gastar" — média mensal de gasto por
   * categoria, olhando só o que já foi de fato PAGO (paidAt) nos últimos
   * CATEGORY_SPEND_MONTHS meses. Diferente de cashFlow (que projeta
   * PENDING pra frente), isso é sobre histórico real. Média = soma do
   * período / CATEGORY_SPEND_MONTHS (denominador fixo, não só os meses com
   * lançamento) — reflete "quanto normalmente sai por mês" mesmo pra uma
   * categoria que não tem gasto todo mês (ex.: seguro anual). Um
   * lançamento com excludeFromAverage nunca entra na conta — pontual/fora
   * do padrão, não representativo da categoria.
   */
  async categorySpend(
    currentUser: AuthenticatedUser,
  ): Promise<CategorySpendResult> {
    const companyId = resolveCompanyId(currentUser);

    const windowStart = new Date();
    windowStart.setUTCDate(1);
    windowStart.setUTCHours(0, 0, 0, 0);
    windowStart.setUTCMonth(
      windowStart.getUTCMonth() - (CATEGORY_SPEND_MONTHS - 1),
    );

    const [projectExpenses, companyExpenses] = await Promise.all([
      this.prisma.projectExpense.findMany({
        where: {
          project: { companyId, deletedAt: null },
          status: PaymentStatus.PAID,
          paidAt: { gte: windowStart },
        },
      }),
      this.prisma.companyExpense.findMany({
        where: {
          companyId,
          status: PaymentStatus.PAID,
          paidAt: { gte: windowStart },
        },
      }),
    ]);

    const totals = new Map<
      ExpenseCategory | null,
      { total: number; count: number }
    >();
    for (const expense of [...projectExpenses, ...companyExpenses]) {
      if (expense.excludeFromAverage) continue;
      const key = expense.category ?? null;
      const entry = totals.get(key) ?? { total: 0, count: 0 };
      entry.total += expense.amount;
      entry.count += 1;
      totals.set(key, entry);
    }

    const rows: CategorySpendRow[] = Array.from(totals.entries())
      .map(([category, { total, count }]) => ({
        category,
        total,
        average: total / CATEGORY_SPEND_MONTHS,
        count,
      }))
      .sort((a, b) => b.average - a.average);

    return { months: CATEGORY_SPEND_MONTHS, rows };
  }
}
