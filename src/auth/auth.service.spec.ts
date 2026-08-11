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

function encodeState(state: object): string {
  return Buffer.from(JSON.stringify(state)).toString('base64');
}

describe('AuthService.loginOrRegisterWithGoogle', () => {
  let prisma: MockPrisma;
  let service: AuthService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    const jwt = { signAsync: jest.fn().mockResolvedValue('signed-jwt') };
    service = new AuthService(prisma as unknown as PrismaService, jwt as never);
  });

  it('logs an existing (googleId-linked) user in without touching state', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'ana@escritorio.com.br',
      googleId: 'google-123',
      role: UserRole.ADMIN,
      companyId: 'company-1',
    });

    const result = await service.loginOrRegisterWithGoogle(buildProfile());

    expect(result).toEqual({ accessToken: 'signed-jwt' });
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

    await service.loginOrRegisterWithGoogle(buildProfile());

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { googleId: 'google-123' },
    });
  });

  it('throws when a brand-new Google user has no state (company document/type)', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.loginOrRegisterWithGoogle(buildProfile()),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when the state companyDocument is already registered', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.company.findUnique.mockResolvedValue({ id: 'existing-company' });

    const state = encodeState({
      companyDocument: '11.111.111/0001-11',
      companyDocumentType: 'CNPJ',
    });

    await expect(
      service.loginOrRegisterWithGoogle(buildProfile(), state),
    ).rejects.toThrow(ConflictException);
  });

  it('creates a Company + ADMIN user for a brand-new Google signup with valid state', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
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
              email: 'ana@escritorio.com.br',
              role: UserRole.ADMIN,
              companyId: 'company-2',
            }),
          },
        }),
    );

    const state = encodeState({
      companyDocument: '22.222.222/0001-22',
      companyDocumentType: 'CNPJ',
    });
    const result = await service.loginOrRegisterWithGoogle(
      buildProfile(),
      state,
    );

    expect(result).toEqual({ accessToken: 'signed-jwt' });
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
