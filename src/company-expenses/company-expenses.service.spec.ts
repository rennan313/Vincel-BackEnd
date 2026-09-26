import { NotFoundException } from '@nestjs/common';
import {
  ExpenseCategory,
  PaymentStatus,
  RecurringFrequency,
  UserRole,
} from '@prisma/client';
import {
  CompanyExpensesService,
  nextRecurrenceDate,
} from './company-expenses.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

type MockPrisma = {
  companyExpense: {
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    findUnique: jest.Mock;
  };
};

function buildPrismaMock(): MockPrisma {
  return {
    companyExpense: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((args: { data: unknown }) => Promise.resolve(args.data)),
      update: jest.fn((args: { data: unknown }) => Promise.resolve(args.data)),
      delete: jest.fn(),
      findUnique: jest.fn(),
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

function buildExpense(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'expense-1',
    companyId: 'company-1',
    name: 'Aluguel do escritório',
    amount: 4500,
    notes: null,
    category: ExpenseCategory.rent,
    dueDate: new Date('2026-10-05'),
    status: PaymentStatus.PENDING,
    paidAt: null,
    recurring: false,
    ...overrides,
  };
}

describe('nextRecurrenceDate', () => {
  it('adds 7 days for weekly', () => {
    const result = nextRecurrenceDate(
      new Date('2026-10-05'),
      RecurringFrequency.weekly,
    );
    expect(result.toISOString().slice(0, 10)).toBe('2026-10-12');
  });

  it('adds 1 month for monthly, preserving the day', () => {
    const result = nextRecurrenceDate(
      new Date('2026-10-05'),
      RecurringFrequency.monthly,
    );
    expect(result.toISOString().slice(0, 10)).toBe('2026-11-05');
  });

  it('adds 1 year for yearly, preserving the day', () => {
    const result = nextRecurrenceDate(
      new Date('2026-10-05'),
      RecurringFrequency.yearly,
    );
    expect(result.toISOString().slice(0, 10)).toBe('2027-10-05');
  });

  it('clamps to the last day of the month instead of overflowing (31 Jan + monthly)', () => {
    const result = nextRecurrenceDate(
      new Date('2026-01-31'),
      RecurringFrequency.monthly,
    );
    // 2026 não é bissexto — fevereiro tem 28 dias. Sem o clamp,
    // date.setUTCMonth sozinho transbordaria pra 2/3 de março.
    expect(result.toISOString().slice(0, 10)).toBe('2026-02-28');
  });

  it('clamps a leap-year Feb 29 to Feb 28 the following (non-leap) year', () => {
    const result = nextRecurrenceDate(
      new Date('2028-02-29'),
      RecurringFrequency.yearly,
    );
    expect(result.toISOString().slice(0, 10)).toBe('2029-02-28');
  });

  it('falls back to monthly when no frequency is set (records from before this field existed)', () => {
    const result = nextRecurrenceDate(new Date('2026-10-05'), null);
    expect(result.toISOString().slice(0, 10)).toBe('2026-11-05');
  });
});

describe('CompanyExpensesService.create', () => {
  let prisma: MockPrisma;
  let service: CompanyExpensesService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new CompanyExpensesService(prisma as unknown as PrismaService);
  });

  it('scopes the new expense to the current user company', async () => {
    const result = await service.create(buildCurrentUser(), {
      name: 'Aluguel do escritório',
      amount: 4500,
    });

    expect(result).toMatchObject({
      companyId: 'company-1',
      name: 'Aluguel do escritório',
    });
  });
});

describe('CompanyExpensesService.update', () => {
  let prisma: MockPrisma;
  let service: CompanyExpensesService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new CompanyExpensesService(prisma as unknown as PrismaService);
  });

  it('marking a recurring expense as PAID creates the next month occurrence', async () => {
    prisma.companyExpense.findUnique.mockResolvedValue(
      buildExpense({ recurring: true, dueDate: new Date('2026-10-05') }),
    );
    prisma.companyExpense.update.mockResolvedValue(
      buildExpense({
        recurring: true,
        status: PaymentStatus.PAID,
        dueDate: new Date('2026-10-05'),
      }),
    );

    await service.update(buildCurrentUser(), 'expense-1', {
      status: PaymentStatus.PAID,
    });

    expect(prisma.companyExpense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: 'company-1',
        name: 'Aluguel do escritório',
        amount: 4500,
        category: ExpenseCategory.rent,
        status: PaymentStatus.PENDING,
        recurring: true,
        dueDate: new Date('2026-11-05'),
      }),
    });
  });

  it('respects a weekly recurringFrequency and carries it onto the next occurrence', async () => {
    prisma.companyExpense.findUnique.mockResolvedValue(
      buildExpense({
        recurring: true,
        recurringFrequency: RecurringFrequency.weekly,
        dueDate: new Date('2026-10-05'),
      }),
    );
    prisma.companyExpense.update.mockResolvedValue(
      buildExpense({
        recurring: true,
        recurringFrequency: RecurringFrequency.weekly,
        status: PaymentStatus.PAID,
        dueDate: new Date('2026-10-05'),
      }),
    );

    await service.update(buildCurrentUser(), 'expense-1', {
      status: PaymentStatus.PAID,
    });

    expect(prisma.companyExpense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recurringFrequency: RecurringFrequency.weekly,
        dueDate: new Date('2026-10-12'),
      }),
    });
  });

  it('marking a non-recurring expense as PAID does not create anything', async () => {
    prisma.companyExpense.findUnique.mockResolvedValue(
      buildExpense({ recurring: false }),
    );
    prisma.companyExpense.update.mockResolvedValue(
      buildExpense({ recurring: false, status: PaymentStatus.PAID }),
    );

    await service.update(buildCurrentUser(), 'expense-1', {
      status: PaymentStatus.PAID,
    });

    expect(prisma.companyExpense.create).not.toHaveBeenCalled();
  });

  it('saving an already-PAID recurring expense again does not duplicate the next occurrence', async () => {
    prisma.companyExpense.findUnique.mockResolvedValue(
      buildExpense({ recurring: true, status: PaymentStatus.PAID }),
    );
    prisma.companyExpense.update.mockResolvedValue(
      buildExpense({
        recurring: true,
        status: PaymentStatus.PAID,
        name: 'Aluguel (renomeado)',
      }),
    );

    // Reenviando o mesmo status PAID (ex.: só editando o nome) — não é uma
    // transição, não deve gerar outra ocorrência.
    await service.update(buildCurrentUser(), 'expense-1', {
      status: PaymentStatus.PAID,
      name: 'Aluguel (renomeado)',
    });

    expect(prisma.companyExpense.create).not.toHaveBeenCalled();
  });

  it('rejects an expense that does not belong to the current company', async () => {
    prisma.companyExpense.findUnique.mockResolvedValue(
      buildExpense({ companyId: 'other-company' }),
    );

    await expect(
      service.update(buildCurrentUser(), 'expense-1', {
        status: PaymentStatus.PAID,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
