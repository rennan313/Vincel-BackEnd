import { PaymentStatus, UserRole } from '@prisma/client';
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
      recurring: false,
    });
  });

  it('joins CompanyExpense rows into the same list, without a project', async () => {
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
    });

    expect(result.total).toBe(1);
    expect(result.data[0]).toMatchObject({
      kind: 'company',
      expenseId: 'c1',
      projectId: null,
      projectName: null,
      clientName: null,
      recurring: true,
    });
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
