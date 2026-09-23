import { BadRequestException, ConflictException } from '@nestjs/common';
import { ProposalStatus, UserRole } from '@prisma/client';
import { ProposalsService } from './proposals.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

type MockPrisma = {
  proposal: {
    create: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  $transaction: jest.Mock;
};

function buildPrismaMock(): MockPrisma {
  return {
    proposal: {
      create: jest.fn((args: { data: unknown }) => Promise.resolve(args.data)),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn(),
      update: jest.fn((args: { data: unknown }) => Promise.resolve(args.data)),
    },
    $transaction: jest.fn(),
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

function buildProposal(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'proposal-1',
    companyId: 'company-1',
    clientId: null,
    clientName: 'Ana Beatriz Ferreira',
    projectRequestId: null,
    name: 'Residência Alto da Serra',
    type: 'residencial',
    customType: null,
    areaSqm: 200,
    services: [],
    customServiceLabel: null,
    complexity: null,
    constructionBudget: null,
    feeModel: null,
    feeRate: null,
    estimatedHours: null,
    feeAmount: 15000,
    paymentMethod: null,
    installments: [],
    scope: null,
    notes: null,
    validUntil: null,
    status: ProposalStatus.SENT,
    statusHistory: [{ status: ProposalStatus.SENT, changedAt: new Date() }],
    sentAt: new Date(),
    decidedAt: null,
    rejectionReason: null,
    convertedProjectId: null,
    active: true,
    deletedAt: null,
    ...overrides,
  };
}

describe('ProposalsService.create', () => {
  let prisma: MockPrisma;
  let service: ProposalsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new ProposalsService(prisma as unknown as PrismaService);
  });

  it('creates a proposal scoped to the company, starting as DRAFT', async () => {
    const result = await service.create(buildCurrentUser(), {
      clientName: 'Ana Beatriz Ferreira',
      name: 'Residência Alto da Serra',
      type: 'residencial',
    });

    expect(result).toMatchObject({
      companyId: 'company-1',
      status: ProposalStatus.DRAFT,
    });
    expect(result.statusHistory).toEqual([
      expect.objectContaining({ status: ProposalStatus.DRAFT }),
    ]);
  });
});

describe('ProposalsService.list', () => {
  let prisma: MockPrisma;
  let service: ProposalsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new ProposalsService(prisma as unknown as PrismaService);
  });

  it('scopes the query by the current user company', async () => {
    await service.list(buildCurrentUser(), { page: 1, pageSize: 20 });

    expect(prisma.proposal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
          deletedAt: null,
        }),
      }),
    );
  });
});

describe('ProposalsService.update', () => {
  let prisma: MockPrisma;
  let service: ProposalsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new ProposalsService(prisma as unknown as PrismaService);
  });

  it('rejects edits once the proposal has been decided', async () => {
    prisma.proposal.findUnique.mockResolvedValue(
      buildProposal({ status: ProposalStatus.ACCEPTED }),
    );

    await expect(
      service.update(buildCurrentUser(), 'proposal-1', { name: 'Novo nome' }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('ProposalsService.updateStatus', () => {
  let prisma: MockPrisma;
  let service: ProposalsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new ProposalsService(prisma as unknown as PrismaService);
  });

  it('rejects a transition not in the allowed table (DRAFT -> ACCEPTED)', async () => {
    prisma.proposal.findUnique.mockResolvedValue(
      buildProposal({ status: ProposalStatus.DRAFT }),
    );

    await expect(
      service.updateStatus(buildCurrentUser(), 'proposal-1', {
        status: ProposalStatus.ACCEPTED,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires a rejectionReason to move to REJECTED', async () => {
    prisma.proposal.findUnique.mockResolvedValue(
      buildProposal({ status: ProposalStatus.SENT }),
    );

    await expect(
      service.updateStatus(buildCurrentUser(), 'proposal-1', {
        status: ProposalStatus.REJECTED,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts SENT -> NEGOTIATING and records it in the history', async () => {
    prisma.proposal.findUnique.mockResolvedValue(
      buildProposal({ status: ProposalStatus.SENT }),
    );

    const result = await service.updateStatus(
      buildCurrentUser(),
      'proposal-1',
      {
        status: ProposalStatus.NEGOTIATING,
        note: 'Cliente pediu revisão do valor.',
      },
    );

    expect(result.status).toBe(ProposalStatus.NEGOTIATING);
    expect(result.statusHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: ProposalStatus.NEGOTIATING,
          note: 'Cliente pediu revisão do valor.',
        }),
      ]),
    );
  });

  it('creates the Project and links convertedProjectId when accepted', async () => {
    prisma.proposal.findUnique.mockResolvedValue(
      buildProposal({ status: ProposalStatus.NEGOTIATING }),
    );
    const projectCreate = jest
      .fn()
      .mockResolvedValue({ id: 'project-1', name: 'Residência Alto da Serra' });
    const proposalUpdateInTx = jest.fn(
      (args: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'proposal-1', ...args.data }),
    );
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn({
        proposal: {
          findUnique: jest
            .fn()
            .mockResolvedValue(
              buildProposal({ status: ProposalStatus.NEGOTIATING }),
            ),
          update: proposalUpdateInTx,
        },
        project: { create: projectCreate },
      }),
    );

    const result = await service.updateStatus(
      buildCurrentUser(),
      'proposal-1',
      {
        status: ProposalStatus.ACCEPTED,
      },
    );

    expect(projectCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Residência Alto da Serra',
          companyId: 'company-1',
        }),
      }),
    );
    expect(result).toMatchObject({
      status: ProposalStatus.ACCEPTED,
      convertedProjectId: 'project-1',
    });
  });

  it('rejects accepting a proposal that was already decided in a race', async () => {
    prisma.proposal.findUnique.mockResolvedValue(
      buildProposal({ status: ProposalStatus.NEGOTIATING }),
    );
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn({
        proposal: {
          findUnique: jest
            .fn()
            .mockResolvedValue(
              buildProposal({ status: ProposalStatus.REJECTED }),
            ),
          update: jest.fn(),
        },
        project: { create: jest.fn() },
      }),
    );

    await expect(
      service.updateStatus(buildCurrentUser(), 'proposal-1', {
        status: ProposalStatus.ACCEPTED,
      }),
    ).rejects.toThrow(ConflictException);
  });
});

describe('ProposalsService expiry', () => {
  let prisma: MockPrisma;
  let service: ProposalsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new ProposalsService(prisma as unknown as PrismaService);
  });

  it('reads a SENT proposal past its validUntil as EXPIRED', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    prisma.proposal.findUnique.mockResolvedValue(
      buildProposal({ status: ProposalStatus.SENT, validUntil: pastDate }),
    );

    const result = await service.findOne(buildCurrentUser(), 'proposal-1');

    expect(prisma.proposal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: ProposalStatus.EXPIRED }),
      }),
    );
    expect(result.status).toBe(ProposalStatus.EXPIRED);
  });

  it('leaves a SENT proposal alone when validUntil has not passed yet', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    prisma.proposal.findUnique.mockResolvedValue(
      buildProposal({ status: ProposalStatus.SENT, validUntil: futureDate }),
    );

    const result = await service.findOne(buildCurrentUser(), 'proposal-1');

    expect(prisma.proposal.update).not.toHaveBeenCalled();
    expect(result.status).toBe(ProposalStatus.SENT);
  });
});
