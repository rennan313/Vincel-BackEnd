import { BadRequestException, ConflictException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

type MockPrisma = {
  user: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  company: {
    findUnique: jest.Mock;
  };
  $transaction: jest.Mock;
};

function buildPrismaMock(): MockPrisma {
  return {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

function buildProfile(
  overrides: Partial<{ id: string; email: string; displayName: string }> = {},
) {
  return {
    id: overrides.id ?? 'google-123',
    displayName: overrides.displayName ?? 'Ana Beatriz Ferreira',
    emails: [
      { value: overrides.email ?? 'ana@escritorio.com.br', verified: true },
    ],
  } as unknown as import('passport-google-oauth20').Profile;
}

function buildJwt() {
  // Mimics @nestjs/jwt closely enough for these tests: sign returns an
  // opaque token embedding the payload, verify decodes it back out.
  return {
    signAsync: jest.fn((payload: object) =>
      Promise.resolve(`signed:${JSON.stringify(payload)}`),
    ),
    verifyAsync: jest.fn((token: string) => {
      if (!token.startsWith('signed:')) throw new Error('invalid token');
      return Promise.resolve(JSON.parse(token.slice('signed:'.length)));
    }),
  };
}

describe('AuthService.loginOrRegisterWithGoogle', () => {
  let prisma: MockPrisma;
  let service: AuthService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    const jwt = buildJwt();
    service = new AuthService(prisma as unknown as PrismaService, jwt as never);
  });

  it('logs an existing (googleId-linked) user in', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'ana@escritorio.com.br',
      googleId: 'google-123',
      role: UserRole.ADMIN,
      companyId: 'company-1',
    });

    const result = await service.loginOrRegisterWithGoogle(buildProfile());

    expect(result.status).toBe('authenticated');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('links googleId onto an existing password-based account matched by e-mail', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'ana@escritorio.com.br',
      googleId: null,
      role: UserRole.ADMIN,
      companyId: 'company-1',
    });
    prisma.user.update.mockResolvedValue({
      id: 'user-1',
      email: 'ana@escritorio.com.br',
      googleId: 'google-123',
      role: UserRole.ADMIN,
      companyId: 'company-1',
    });

    const result = await service.loginOrRegisterWithGoogle(buildProfile());

    expect(result.status).toBe('authenticated');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { googleId: 'google-123' },
    });
  });

  it('returns a pending token for a brand-new Google user, without touching the DB', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    const result = await service.loginOrRegisterWithGoogle(buildProfile());

    expect(result.status).toBe('pending');
    if (result.status !== 'pending') throw new Error('unreachable');
    expect(result.pendingToken).toBeTruthy();
    expect(result.name).toBe('Ana Beatriz Ferreira');
    expect(result.email).toBe('ana@escritorio.com.br');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('AuthService.completeGoogleRegistration', () => {
  let prisma: MockPrisma;
  let service: AuthService;
  let jwt: ReturnType<typeof buildJwt>;

  beforeEach(() => {
    prisma = buildPrismaMock();
    jwt = buildJwt();
    service = new AuthService(prisma as unknown as PrismaService, jwt as never);
  });

  async function pendingTokenFor(profile = buildProfile()) {
    prisma.user.findFirst.mockResolvedValueOnce(null);
    const pending = await service.loginOrRegisterWithGoogle(profile);
    if (pending.status !== 'pending') throw new Error('expected pending');
    return pending.pendingToken;
  }

  it('rejects a malformed/expired pending token', async () => {
    await expect(
      service.completeGoogleRegistration({
        pendingToken: 'not-a-real-token',
        companyDocument: '11.111.111/0001-11',
        companyDocumentType: 'CNPJ',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a real access token used as a pending token (wrong purpose)', async () => {
    const accessToken = await jwt.signAsync({
      sub: 'user-1',
      email: 'x@y.com',
      role: 'ADMIN',
      companyId: null,
    });
    await expect(
      service.completeGoogleRegistration({
        pendingToken: accessToken,
        companyDocument: '11.111.111/0001-11',
        companyDocumentType: 'CNPJ',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when the company document is already registered', async () => {
    const pendingToken = await pendingTokenFor();
    prisma.user.findFirst.mockResolvedValueOnce(null);
    prisma.company.findUnique.mockResolvedValue({ id: 'existing-company' });

    await expect(
      service.completeGoogleRegistration({
        pendingToken,
        companyDocument: '22.222.222/0001-22',
        companyDocumentType: 'CNPJ',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('creates a Company + ADMIN user from the pending profile and the given document', async () => {
    const pendingToken = await pendingTokenFor();
    prisma.user.findFirst.mockResolvedValueOnce(null);
    prisma.company.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          company: {
            create: jest.fn().mockResolvedValue({
              id: 'company-2',
              name: 'Ana Beatriz Ferreira',
            }),
          },
          user: {
            create: jest.fn().mockResolvedValue({
              id: 'user-2',
              name: 'Ana Beatriz Ferreira',
              email: 'ana@escritorio.com.br',
              role: UserRole.ADMIN,
              companyId: 'company-2',
            }),
          },
        }),
    );

    const result = await service.completeGoogleRegistration({
      pendingToken,
      companyDocument: '33.333.333/0001-33',
      companyDocumentType: 'CNPJ',
    });

    expect(result.accessToken).toBeTruthy();
    expect(result.user.email).toBe('ana@escritorio.com.br');
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
