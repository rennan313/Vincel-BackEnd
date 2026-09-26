import { NotFoundException } from '@nestjs/common';
import { PaymentStatus, UserRole } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

type MockPrisma = {
  project: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

function buildPrismaMock(): MockPrisma {
  return {
    project: {
      findUnique: jest.fn(),
      update: jest.fn((args: { data: unknown }) => Promise.resolve(args.data)),
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
    companyId: 'company-1',
    deletedAt: null,
    installments: [
      {
        id: 'i1',
        label: 'Parcela 1',
        amount: 1000,
        status: PaymentStatus.PENDING,
        paidAt: null,
      },
      {
        id: 'i2',
        label: 'Parcela 2',
        amount: 2000,
        status: PaymentStatus.PENDING,
        paidAt: null,
      },
    ],
    ...overrides,
  };
}

describe('ProjectsService.updateInstallmentStatus', () => {
  let prisma: MockPrisma;
  let service: ProjectsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new ProjectsService(prisma as unknown as PrismaService);
  });

  it('marks only the matching installment as paid, setting paidAt', async () => {
    prisma.project.findUnique.mockResolvedValue(buildProject());

    const result = await service.updateInstallmentStatus(
      buildCurrentUser(),
      'project-1',
      'i1',
      { status: PaymentStatus.PAID },
    );

    expect(result.installments).toEqual([
      expect.objectContaining({
        id: 'i1',
        status: PaymentStatus.PAID,
        paidAt: expect.any(Date),
      }),
      expect.objectContaining({
        id: 'i2',
        status: PaymentStatus.PENDING,
        paidAt: null,
      }),
    ]);
  });

  it('clears paidAt when moved back to pending', async () => {
    prisma.project.findUnique.mockResolvedValue(
      buildProject({
        installments: [
          {
            id: 'i1',
            label: 'Parcela 1',
            amount: 1000,
            status: PaymentStatus.PAID,
            paidAt: new Date(),
          },
        ],
      }),
    );

    const result = await service.updateInstallmentStatus(
      buildCurrentUser(),
      'project-1',
      'i1',
      { status: PaymentStatus.PENDING },
    );

    expect(result.installments[0]).toMatchObject({
      status: PaymentStatus.PENDING,
      paidAt: null,
    });
  });

  it('updates only the dueDate when no status is sent, leaving payment status untouched', async () => {
    prisma.project.findUnique.mockResolvedValue(buildProject());

    const result = await service.updateInstallmentStatus(
      buildCurrentUser(),
      'project-1',
      'i1',
      { dueDate: '2026-12-01' },
    );

    expect(result.installments[0]).toMatchObject({
      id: 'i1',
      status: PaymentStatus.PENDING,
      dueDate: new Date('2026-12-01'),
    });
  });

  it('rejects an installment id that does not exist on the project', async () => {
    prisma.project.findUnique.mockResolvedValue(buildProject());

    await expect(
      service.updateInstallmentStatus(
        buildCurrentUser(),
        'project-1',
        'missing',
        {
          status: PaymentStatus.PAID,
        },
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
