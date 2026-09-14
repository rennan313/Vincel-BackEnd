import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
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
  refreshToken: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
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
    refreshToken: {
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
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

function buildConfig(values: Record<string, string> = {}) {
  return { get: jest.fn((key: string) => values[key]) };
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
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as never,
      buildConfig() as never,
    );
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
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as never,
      buildConfig() as never,
    );
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
          // No default plan configured — startTrialSubscription should be a no-op.
          plan: { findFirst: jest.fn().mockResolvedValue(null) },
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

  it('starts a TRIALING subscription on the default plan when one is configured', async () => {
    const pendingToken = await pendingTokenFor();
    prisma.user.findFirst.mockResolvedValueOnce(null);
    prisma.company.findUnique.mockResolvedValue(null);
    const subscriptionCreate = jest.fn().mockResolvedValue({});
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          company: {
            create: jest.fn().mockResolvedValue({
              id: 'company-3',
              name: 'Ana Beatriz Ferreira',
            }),
          },
          user: {
            create: jest.fn().mockResolvedValue({
              id: 'user-3',
              name: 'Ana Beatriz Ferreira',
              email: 'ana@escritorio.com.br',
              role: UserRole.ADMIN,
              companyId: 'company-3',
            }),
          },
          plan: {
            findFirst: jest
              .fn()
              .mockResolvedValue({ id: 'plan-solo', isDefault: true }),
          },
          subscription: { create: subscriptionCreate },
        }),
    );

    await service.completeGoogleRegistration({
      pendingToken,
      companyDocument: '44.444.444/0001-44',
      companyDocumentType: 'CNPJ',
    });

    expect(subscriptionCreate).toHaveBeenCalledTimes(1);
    const [{ data }] = subscriptionCreate.mock.calls[0] as [
      { data: Record<string, unknown> },
    ];
    expect(data.companyId).toBe('company-3');
    expect(data.planId).toBe('plan-solo');
    expect(data.status).toBe('TRIALING');
  });
});

describe('AuthService.login', () => {
  let prisma: MockPrisma;
  let service: AuthService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new AuthService(
      prisma as unknown as PrismaService,
      buildJwt() as never,
      buildConfig() as never,
    );
  });

  async function userWithPassword(
    password: string,
    overrides: Partial<{ active: boolean }> = {},
  ) {
    return {
      id: 'user-1',
      email: 'ana@escritorio.com.br',
      passwordHash: await bcrypt.hash(password, 10),
      role: UserRole.ADMIN,
      companyId: 'company-1',
      active: overrides.active ?? true,
    };
  }

  it('rejects an unknown e-mail', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'nobody@x.com', password: 'whatever' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a Google-only account (no passwordHash) trying to log in with a password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'ana@escritorio.com.br',
      passwordHash: null,
      active: true,
    });

    await expect(
      service.login({ email: 'ana@escritorio.com.br', password: 'whatever' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a wrong password', async () => {
    prisma.user.findUnique.mockResolvedValue(
      await userWithPassword('correct-pass'),
    );

    await expect(
      service.login({ email: 'ana@escritorio.com.br', password: 'wrong-pass' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a deactivated account even with the right password', async () => {
    prisma.user.findUnique.mockResolvedValue(
      await userWithPassword('correct-pass', { active: false }),
    );

    await expect(
      service.login({
        email: 'ana@escritorio.com.br',
        password: 'correct-pass',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('logs in and issues a token pair on correct credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(
      await userWithPassword('correct-pass'),
    );

    const result = await service.login({
      email: 'ana@escritorio.com.br',
      password: 'correct-pass',
    });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user.email).toBe('ana@escritorio.com.br');
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
  });
});

describe('AuthService.refreshTokens', () => {
  let prisma: MockPrisma;
  let service: AuthService;

  const storedUser = {
    id: 'user-1',
    email: 'ana@escritorio.com.br',
    role: UserRole.ADMIN,
    companyId: 'company-1',
  };

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new AuthService(
      prisma as unknown as PrismaService,
      buildJwt() as never,
      buildConfig() as never,
    );
  });

  it('rejects an unknown refresh token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(null);

    await expect(service.refreshTokens('not-a-real-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an expired refresh token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      user: storedUser,
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(service.refreshTokens('expired-token')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.refreshToken.update).not.toHaveBeenCalled();
  });

  it('rotates a valid refresh token: revokes it and issues a fresh pair', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      user: storedUser,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    const result = await service.refreshTokens('valid-token');

    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'rt-1' },
      data: { revokedAt: expect.any(Date) },
    });
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('treats reuse of an already-rotated token as theft and revokes every session on the account', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      user: storedUser,
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    await expect(service.refreshTokens('already-used-token')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});

describe('AuthService.revokeRefreshToken', () => {
  it('revokes only the matching, still-active token', async () => {
    const prisma = buildPrismaMock();
    const service = new AuthService(
      prisma as unknown as PrismaService,
      buildJwt() as never,
      buildConfig() as never,
    );

    await service.revokeRefreshToken('some-token');

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { tokenHash: expect.any(String), revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
