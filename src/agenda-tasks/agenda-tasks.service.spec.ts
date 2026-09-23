import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AgendaTasksService } from './agenda-tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

type MockPrisma = {
  agendaTask: {
    create: jest.Mock;
  };
  user: {
    findFirst: jest.Mock;
  };
};

function buildPrismaMock(): MockPrisma {
  return {
    agendaTask: {
      create: jest.fn((args: { data: unknown }) => Promise.resolve(args.data)),
    },
    user: {
      findFirst: jest.fn(),
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

describe('AgendaTasksService.create', () => {
  let prisma: MockPrisma;
  let service: AgendaTasksService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new AgendaTasksService(prisma as unknown as PrismaService);
  });

  it('creates a plain tarefa (no endDate/assignee) as today', async () => {
    const result = await service.create(buildCurrentUser(), {
      name: 'Atualizar programa de necessidades',
      date: '2026-09-18',
    });

    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      name: 'Atualizar programa de necessidades',
      endDate: null,
      details: null,
      assigneeUserId: null,
      companyId: 'company-1',
    });
  });

  it('accepts a responsável and details on a plain tarefa (no endDate)', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'user-2' });

    const result = await service.create(buildCurrentUser(), {
      name: 'Atualizar programa de necessidades',
      date: '2026-09-18',
      assigneeUserId: 'user-2',
      details: 'Levar as plantas atualizadas.',
    });

    expect(result).toMatchObject({
      endDate: null,
      assigneeUserId: 'user-2',
      details: 'Levar as plantas atualizadas.',
    });
  });

  it('creates a compromisso with a valid endDate and assignee', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'user-2' });

    const result = await service.create(buildCurrentUser(), {
      name: 'Reunião de layout',
      date: '2026-09-18T09:30:00.000Z',
      endDate: '2026-09-18T10:15:00.000Z',
      assigneeUserId: 'user-2',
    });

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'user-2', companyId: 'company-1', active: true },
      select: { id: true },
    });
    expect(result).toMatchObject({
      assigneeUserId: 'user-2',
      endDate: new Date('2026-09-18T10:15:00.000Z'),
    });
  });

  it('rejects an endDate at or before the start date', async () => {
    await expect(
      service.create(buildCurrentUser(), {
        name: 'Reunião de layout',
        date: '2026-09-18T09:30:00.000Z',
        endDate: '2026-09-18T09:30:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an assigneeUserId that does not resolve within the company', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.create(buildCurrentUser(), {
        name: 'Reunião de layout',
        date: '2026-09-18T09:30:00.000Z',
        endDate: '2026-09-18T10:15:00.000Z',
        assigneeUserId: 'user-from-another-company',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
