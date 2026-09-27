import {
  ExpenseCategory,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from '@prisma/client';
import { FinancialService } from './financial.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

type MockPrisma = {
  project: {
    findMany: jest.Mock;
  };
  projectExpense: {
    aggregate: jest.Mock;
    count: jest.Mock;
    findMany: jest.Mock;
  };
  companyExpense: {
    aggregate: jest.Mock;
    count: jest.Mock;
    findMany: jest.Mock;
  };
};

function buildPrismaMock(): MockPrisma {
  return {
    project: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    projectExpense: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    companyExpense: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

function buildCurrentUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: 'user-1',
    email: 'ana@escritorio.com.br',
    role: UserRole.ADMIN,
    companyId: 'company-1',
    ...overrides,
  };
}

function buildProject(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'project-1',
    name: 'Residência Alto da Serra',
    clientName: 'Ana Beatriz Ferreira',
    installments: [],
    ...overrides,
  };
}

describe('FinancialService.summary', () => {
  let prisma: MockPrisma;
  let service: FinancialService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new FinancialService(prisma as unknown as PrismaService);
  });

  it('scopes every query by the current user company', async () => {
    await service.summary(buildCurrentUser());

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'company-1', deletedAt: null },
      }),
    );
    expect(prisma.projectExpense.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          project: { companyId: 'company-1', deletedAt: null },
          status: PaymentStatus.PENDING,
        }),
      }),
    );
    expect(prisma.companyExpense.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
          status: PaymentStatus.PENDING,
        }),
      }),
    );
  });

  it('sums only PENDING installments and counts only the overdue ones', async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    prisma.project.findMany.mockResolvedValue([
      buildProject({
        installments: [
          {
            id: 'i1',
            label: 'Parcela 1',
            amount: 1000,
            status: PaymentStatus.PENDING,
            dueDate: past,
          },
          {
            id: 'i2',
            label: 'Parcela 2',
            amount: 2000,
            status: PaymentStatus.PENDING,
            dueDate: future,
          },
          {
            id: 'i3',
            label: 'Parcela 3',
            amount: 5000,
            status: PaymentStatus.PAID,
            dueDate: past,
          },
        ],
      }),
    ]);
    prisma.projectExpense.aggregate.mockResolvedValue({
      _sum: { amount: 300 },
    });
    prisma.projectExpense.count.mockResolvedValue(2);

    const result = await service.summary(buildCurrentUser());

    expect(result).toEqual({
      receivablePending: 3000, // 1000 + 2000, PAID (5000) excluded
      receivableOverdueCount: 1, // only i1 is PENDING + past due
      payablePending: 300,
      payableOverdueCount: 2,
    });
  });

  it('adds CompanyExpense sums/counts to the ProjectExpense ones', async () => {
    prisma.projectExpense.aggregate.mockResolvedValue({
      _sum: { amount: 300 },
    });
    prisma.projectExpense.count.mockResolvedValue(1);
    prisma.companyExpense.aggregate.mockResolvedValue({
      _sum: { amount: 4500 },
    });
    prisma.companyExpense.count.mockResolvedValue(2);

    const result = await service.summary(buildCurrentUser());

    expect(result.payablePending).toBe(4800);
    expect(result.payableOverdueCount).toBe(3);
  });
});

describe('FinancialService.receivables', () => {
  let prisma: MockPrisma;
  let service: FinancialService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new FinancialService(prisma as unknown as PrismaService);
  });

  it('flattens installments across every project into one list', async () => {
    prisma.project.findMany.mockResolvedValue([
      buildProject({
        id: 'p1',
        installments: [
          {
            id: 'i1',
            label: 'Parcela 1',
            amount: 1000,
            status: PaymentStatus.PENDING,
            dueDate: null,
          },
        ],
      }),
      buildProject({
        id: 'p2',
        name: 'Escritório Vila Nova',
        installments: [
          {
            id: 'i2',
            label: 'Parcela 1',
            amount: 2000,
            status: PaymentStatus.PAID,
            dueDate: null,
          },
        ],
      }),
    ]);

    const result = await service.receivables(buildCurrentUser(), {
      page: 1,
      pageSize: 20,
    });

    expect(result.total).toBe(2);
    expect(result.data.map((row) => row.projectId)).toEqual(['p1', 'p2']);
  });

  it('filters by status', async () => {
    prisma.project.findMany.mockResolvedValue([
      buildProject({
        installments: [
          {
            id: 'i1',
            label: 'Parcela 1',
            amount: 1000,
            status: PaymentStatus.PENDING,
            dueDate: null,
          },
          {
            id: 'i2',
            label: 'Parcela 2',
            amount: 2000,
            status: PaymentStatus.PAID,
            dueDate: null,
          },
        ],
      }),
    ]);

    const result = await service.receivables(buildCurrentUser(), {
      page: 1,
      pageSize: 20,
      status: PaymentStatus.PAID,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].installmentId).toBe('i2');
  });

  it("carries the project's chosen paymentMethod onto every one of its rows", async () => {
    prisma.project.findMany.mockResolvedValue([
      buildProject({
        paymentMethod: PaymentMethod.installments,
        installments: [
          {
            id: 'i1',
            label: 'Parcela 1',
            amount: 1000,
            status: PaymentStatus.PENDING,
            dueDate: null,
          },
          {
            id: 'i2',
            label: 'Parcela 2',
            amount: 1000,
            status: PaymentStatus.PENDING,
            dueDate: null,
          },
        ],
      }),
    ]);

    const result = await service.receivables(buildCurrentUser(), {
      page: 1,
      pageSize: 20,
    });

    expect(
      result.data.every(
        (row) => row.paymentMethod === PaymentMethod.installments,
      ),
    ).toBe(true);
  });
});

describe('FinancialService.payables', () => {
  let prisma: MockPrisma;
  let service: FinancialService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new FinancialService(prisma as unknown as PrismaService);
  });

  it('scopes the ProjectExpense and CompanyExpense queries by company', async () => {
    await service.payables(buildCurrentUser(), { page: 1, pageSize: 20 });

    expect(prisma.projectExpense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          project: { companyId: 'company-1', deletedAt: null },
        }),
      }),
    );
    expect(prisma.companyExpense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: 'company-1' } }),
    );
  });

  it('maps ProjectExpense rows with the joined project name/client', async () => {
    prisma.projectExpense.findMany.mockResolvedValue([
      {
        id: 'e1',
        projectId: 'p1',
        name: 'Taxa da prefeitura',
        amount: 300,
        category: ExpenseCategory.taxes,
        dueDate: null,
        status: PaymentStatus.PENDING,
        paidAt: null,
        project: {
          name: 'Residência Alto da Serra',
          clientName: 'Ana Beatriz Ferreira',
        },
      },
    ]);

    const result = await service.payables(buildCurrentUser(), {
      page: 1,
      pageSize: 20,
    });

    expect(result.data[0]).toMatchObject({
      kind: 'project',
      expenseId: 'e1',
      projectName: 'Residência Alto da Serra',
      clientName: 'Ana Beatriz Ferreira',
      category: ExpenseCategory.taxes,
      recurring: false,
    });
  });

  it('joins CompanyExpense rows into the same list, without a project', async () => {
    prisma.companyExpense.findMany.mockResolvedValue([
      {
        id: 'c1',
        name: 'Aluguel do escritório',
        amount: 4500,
        category: ExpenseCategory.rent,
        dueDate: null,
        status: PaymentStatus.PENDING,
        paidAt: null,
        recurring: true,
      },
    ]);

    const result = await service.payables(buildCurrentUser(), {
      page: 1,
      pageSize: 20,
    });

    expect(result.total).toBe(1);
    expect(result.data[0]).toMatchObject({
      kind: 'company',
      expenseId: 'c1',
      projectId: null,
      projectName: null,
      clientName: null,
      category: ExpenseCategory.rent,
      recurring: true,
    });
  });

  it('filters to only recurring rows ("contas fixas") when recurring=true is passed', async () => {
    prisma.projectExpense.findMany.mockResolvedValue([
      {
        id: 'e1',
        projectId: 'p1',
        name: 'Taxa da prefeitura',
        amount: 300,
        dueDate: null,
        status: PaymentStatus.PENDING,
        paidAt: null,
        project: {
          name: 'Residência Alto da Serra',
          clientName: 'Ana Beatriz Ferreira',
        },
      },
    ]);
    prisma.companyExpense.findMany.mockResolvedValue([
      {
        id: 'c1',
        name: 'Aluguel do escritório',
        amount: 4500,
        dueDate: null,
        status: PaymentStatus.PENDING,
        paidAt: null,
        recurring: true,
      },
      {
        id: 'c2',
        name: 'Reforma pontual',
        amount: 1200,
        dueDate: null,
        status: PaymentStatus.PENDING,
        paidAt: null,
        recurring: false,
      },
    ]);

    const result = await service.payables(buildCurrentUser(), {
      page: 1,
      pageSize: 20,
      recurring: 'true',
    });

    expect(result.total).toBe(1);
    expect(result.data[0].expenseId).toBe('c1');
  });

  it('filters the merged list by search across both sources', async () => {
    prisma.projectExpense.findMany.mockResolvedValue([
      {
        id: 'e1',
        projectId: 'p1',
        name: 'Taxa da prefeitura',
        amount: 300,
        dueDate: null,
        status: PaymentStatus.PENDING,
        paidAt: null,
        project: {
          name: 'Residência Alto da Serra',
          clientName: 'Ana Beatriz Ferreira',
        },
      },
    ]);
    prisma.companyExpense.findMany.mockResolvedValue([
      {
        id: 'c1',
        name: 'Aluguel do escritório',
        amount: 4500,
        dueDate: null,
        status: PaymentStatus.PENDING,
        paidAt: null,
        recurring: true,
      },
    ]);

    const result = await service.payables(buildCurrentUser(), {
      page: 1,
      pageSize: 20,
      search: 'aluguel',
    });

    expect(result.total).toBe(1);
    expect(result.data[0].expenseId).toBe('c1');
  });
});

describe('FinancialService.cashFlow', () => {
  let prisma: MockPrisma;
  let service: FinancialService;

  // "Hoje" fixo em 2026-09-26 — a janela de 6 meses vira sempre
  // [2026-09, 2026-10, 2026-11, 2026-12, 2027-01, 2027-02], então os testes
  // não dependem de em que mês real o CI/dev roda.
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-26T12:00:00.000Z'));
    prisma = buildPrismaMock();
    service = new FinancialService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('buckets a pending installment into the month of its dueDate', async () => {
    prisma.project.findMany.mockResolvedValue([
      buildProject({
        installments: [
          {
            id: 'i1',
            label: 'Parcela 1',
            amount: 5000,
            status: PaymentStatus.PENDING,
            dueDate: new Date('2026-11-05'),
          },
        ],
      }),
    ]);

    const result = await service.cashFlow(buildCurrentUser());

    expect(result.months.map((m) => m.month)).toEqual([
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
    ]);
    expect(result.months[2]).toMatchObject({
      month: '2026-11',
      receivables: 5000,
    });
    expect(
      result.months
        .filter((m) => m.month !== '2026-11')
        .every((m) => m.receivables === 0),
    ).toBe(true);
  });

  it('folds an overdue pending installment into the current month, not its past month', async () => {
    prisma.project.findMany.mockResolvedValue([
      buildProject({
        installments: [
          {
            id: 'i1',
            label: 'Parcela atrasada',
            amount: 1000,
            status: PaymentStatus.PENDING,
            dueDate: new Date('2026-06-01'), // 3 meses antes de "hoje"
          },
        ],
      }),
    ]);

    const result = await service.cashFlow(buildCurrentUser());

    expect(result.months[0]).toMatchObject({
      month: '2026-09',
      receivables: 1000,
    });
  });

  it('folds a dueDate beyond the projection window into the last bucket', async () => {
    prisma.project.findMany.mockResolvedValue([
      buildProject({
        installments: [
          {
            id: 'i1',
            label: 'Parcela distante',
            amount: 2000,
            status: PaymentStatus.PENDING,
            dueDate: new Date('2027-08-01'), // além do 6º mês (2027-02)
          },
        ],
      }),
    ]);

    const result = await service.cashFlow(buildCurrentUser());

    expect(result.months[5]).toMatchObject({
      month: '2027-02',
      receivables: 2000,
    });
  });

  it('sums ProjectExpense and CompanyExpense payables into the same month', async () => {
    prisma.projectExpense.findMany.mockResolvedValue([
      {
        id: 'e1',
        amount: 300,
        status: PaymentStatus.PENDING,
        dueDate: new Date('2026-10-15'),
      },
    ]);
    prisma.companyExpense.findMany.mockResolvedValue([
      {
        id: 'c1',
        amount: 4500,
        status: PaymentStatus.PENDING,
        dueDate: new Date('2026-10-20'),
      },
    ]);

    const result = await service.cashFlow(buildCurrentUser());

    expect(result.months[1]).toMatchObject({
      month: '2026-10',
      payables: 4800,
    });
  });

  it('excludes dateless pending rows from the months but sums them into unscheduled totals', async () => {
    prisma.project.findMany.mockResolvedValue([
      buildProject({
        installments: [
          {
            id: 'i1',
            label: 'Sem vencimento',
            amount: 700,
            status: PaymentStatus.PENDING,
            dueDate: null,
          },
        ],
      }),
    ]);
    prisma.projectExpense.findMany.mockResolvedValue([
      { id: 'e1', amount: 200, status: PaymentStatus.PENDING, dueDate: null },
    ]);

    const result = await service.cashFlow(buildCurrentUser());

    expect(result.unscheduledReceivables).toBe(700);
    expect(result.unscheduledPayables).toBe(200);
    expect(
      result.months.every((m) => m.receivables === 0 && m.payables === 0),
    ).toBe(true);
  });

  it('ignores PAID rows entirely — not in any month, not in unscheduled', async () => {
    prisma.project.findMany.mockResolvedValue([
      buildProject({
        installments: [
          {
            id: 'i1',
            label: 'Já paga',
            amount: 9999,
            status: PaymentStatus.PAID,
            dueDate: new Date('2026-10-01'),
          },
        ],
      }),
    ]);
    prisma.companyExpense.findMany.mockResolvedValue([
      { id: 'c1', amount: 9999, status: PaymentStatus.PAID, dueDate: null },
    ]);

    const result = await service.cashFlow(buildCurrentUser());

    expect(
      result.months.every((m) => m.receivables === 0 && m.payables === 0),
    ).toBe(true);
    expect(result.unscheduledReceivables).toBe(0);
    expect(result.unscheduledPayables).toBe(0);
  });
});

describe('FinancialService.categorySpend', () => {
  let prisma: MockPrisma;
  let service: FinancialService;

  // "Hoje" fixo em 2026-09-26 — a janela de 6 meses vira sempre
  // [2026-04 .. 2026-09], mesmo raciocínio do describe de cashFlow acima.
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-26T12:00:00.000Z'));
    prisma = buildPrismaMock();
    service = new FinancialService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sums PAID project and company expenses into the same category', async () => {
    prisma.projectExpense.findMany.mockResolvedValue([
      {
        id: 'e1',
        amount: 300,
        category: ExpenseCategory.taxes,
        status: PaymentStatus.PAID,
        paidAt: new Date('2026-09-10'),
        excludeFromAverage: false,
      },
    ]);
    prisma.companyExpense.findMany.mockResolvedValue([
      {
        id: 'c1',
        amount: 4500,
        category: ExpenseCategory.rent,
        status: PaymentStatus.PAID,
        paidAt: new Date('2026-09-05'),
        excludeFromAverage: false,
      },
      {
        id: 'c2',
        amount: 500,
        category: ExpenseCategory.rent,
        status: PaymentStatus.PAID,
        paidAt: new Date('2026-08-05'),
        excludeFromAverage: false,
      },
    ]);

    const result = await service.categorySpend(buildCurrentUser());

    expect(result.months).toBe(6);
    expect(result.rows).toEqual([
      {
        category: ExpenseCategory.rent,
        total: 5000,
        average: 5000 / 6,
        count: 2,
      },
      {
        category: ExpenseCategory.taxes,
        total: 300,
        average: 300 / 6,
        count: 1,
      },
    ]);
  });

  it('excludes rows flagged excludeFromAverage', async () => {
    prisma.companyExpense.findMany.mockResolvedValue([
      {
        id: 'c1',
        amount: 9999,
        category: ExpenseCategory.other,
        status: PaymentStatus.PAID,
        paidAt: new Date('2026-09-10'),
        excludeFromAverage: true,
      },
    ]);

    const result = await service.categorySpend(buildCurrentUser());

    expect(result.rows).toEqual([]);
  });

  it('queries only PAID rows within the 6-month window (mês atual + 5 anteriores)', async () => {
    await service.categorySpend(buildCurrentUser());

    // A filtragem por data/status é responsabilidade da query — aqui só
    // confirmamos que ela pede exatamente a janela certa.
    expect(prisma.projectExpense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: PaymentStatus.PAID,
          paidAt: { gte: new Date('2026-04-01T00:00:00.000Z') },
        }),
      }),
    );
    expect(prisma.companyExpense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: PaymentStatus.PAID,
          paidAt: { gte: new Date('2026-04-01T00:00:00.000Z') },
        }),
      }),
    );
  });

  it('groups rows with no category under a null bucket', async () => {
    prisma.projectExpense.findMany.mockResolvedValue([
      {
        id: 'e1',
        amount: 200,
        category: null,
        status: PaymentStatus.PAID,
        paidAt: new Date('2026-09-10'),
        excludeFromAverage: false,
      },
    ]);

    const result = await service.categorySpend(buildCurrentUser());

    expect(result.rows).toEqual([
      { category: null, total: 200, average: 200 / 6, count: 1 },
    ]);
  });

  it('sorts rows descending by average', async () => {
    prisma.companyExpense.findMany.mockResolvedValue([
      {
        id: 'c1',
        amount: 100,
        category: ExpenseCategory.marketing,
        status: PaymentStatus.PAID,
        paidAt: new Date('2026-09-10'),
        excludeFromAverage: false,
      },
      {
        id: 'c2',
        amount: 4500,
        category: ExpenseCategory.rent,
        status: PaymentStatus.PAID,
        paidAt: new Date('2026-09-05'),
        excludeFromAverage: false,
      },
    ]);

    const result = await service.categorySpend(buildCurrentUser());

    expect(result.rows.map((row) => row.category)).toEqual([
      ExpenseCategory.rent,
      ExpenseCategory.marketing,
    ]);
  });
});
