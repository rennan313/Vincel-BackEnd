import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProposalStatus,
  UserRole,
  type Proposal,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { resolveCompanyId } from '../common/company-scope';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { ListProposalsDto } from './dto/list-proposals.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { UpdateProposalStatusDto } from './dto/update-proposal-status.dto';

// Estados em que a proposta ainda está "em jogo" — só a partir deles é que
// ela pode expirar por validade ou ser aceita/recusada.
const OPEN_STATUSES: ProposalStatus[] = [
  ProposalStatus.SENT,
  ProposalStatus.NEGOTIATING,
];

const TERMINAL_STATUSES: ProposalStatus[] = [
  ProposalStatus.ACCEPTED,
  ProposalStatus.REJECTED,
  ProposalStatus.EXPIRED,
];

// Tabela fixa de transições permitidas — qualquer combinação fora daqui é
// rejeitada por updateStatus. EXPIRED nunca é um destino manual: ela só
// acontece via applyExpiry, quando a validade já passou.
const ALLOWED_TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
  [ProposalStatus.DRAFT]: [ProposalStatus.SENT],
  [ProposalStatus.SENT]: [
    ProposalStatus.NEGOTIATING,
    ProposalStatus.ACCEPTED,
    ProposalStatus.REJECTED,
  ],
  [ProposalStatus.NEGOTIATING]: [
    ProposalStatus.SENT,
    ProposalStatus.ACCEPTED,
    ProposalStatus.REJECTED,
  ],
  [ProposalStatus.ACCEPTED]: [],
  [ProposalStatus.REJECTED]: [],
  [ProposalStatus.EXPIRED]: [],
};

@Injectable()
export class ProposalsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(currentUser: AuthenticatedUser, query: ListProposalsDto) {
    const companyId = resolveCompanyId(currentUser, query.companyId);
    const where: Prisma.ProposalWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { clientName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return {
      data: await Promise.all(
        data.map((proposal) => this.applyExpiry(proposal)),
      ),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findOne(currentUser: AuthenticatedUser, id: string) {
    const proposal = await this.findScoped(currentUser, id);
    return this.applyExpiry(proposal);
  }

  async create(currentUser: AuthenticatedUser, dto: CreateProposalDto) {
    const companyId = resolveCompanyId(currentUser, dto.companyId);
    const now = new Date();

    return this.prisma.proposal.create({
      data: {
        clientId: dto.clientId,
        clientName: dto.clientName,
        projectRequestId: dto.projectRequestId,
        name: dto.name,
        type: dto.type,
        customType: dto.customType,
        areaSqm: dto.areaSqm,
        services: dto.services ?? [],
        customServiceLabel: dto.customServiceLabel,
        complexity: dto.complexity,
        constructionBudget: dto.constructionBudget,
        feeModel: dto.feeModel,
        feeRate: dto.feeRate,
        estimatedHours: dto.estimatedHours,
        feeAmount: dto.feeAmount,
        paymentMethod: dto.paymentMethod,
        installments: dto.installments,
        scope: dto.scope,
        notes: dto.notes,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        status: ProposalStatus.DRAFT,
        statusHistory: [{ status: ProposalStatus.DRAFT, changedAt: now }],
        companyId,
        deletedAt: null,
      },
    });
  }

  async update(
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateProposalDto,
  ) {
    const proposal = await this.findScoped(currentUser, id);
    if (TERMINAL_STATUSES.includes(proposal.status)) {
      throw new BadRequestException(
        'Esta proposta já foi decidida e não pode mais ser editada.',
      );
    }

    return this.prisma.proposal.update({
      where: { id },
      data: {
        clientId: dto.clientId,
        clientName: dto.clientName,
        projectRequestId: dto.projectRequestId,
        name: dto.name,
        type: dto.type,
        customType: dto.customType,
        areaSqm: dto.areaSqm,
        services: dto.services,
        customServiceLabel: dto.customServiceLabel,
        complexity: dto.complexity,
        constructionBudget: dto.constructionBudget,
        feeModel: dto.feeModel,
        feeRate: dto.feeRate,
        estimatedHours: dto.estimatedHours,
        feeAmount: dto.feeAmount,
        paymentMethod: dto.paymentMethod,
        installments: dto.installments,
        scope: dto.scope,
        notes: dto.notes,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
    });
  }

  /**
   * Transiciona o status da proposta. ACCEPTED é o único caso com efeito
   * colateral: cria o Project correspondente dentro da mesma transação, e
   * relê a proposta dentro dela para nunca aceitar a mesma proposta duas
   * vezes em uma corrida (mesma cautela do obsolete-version guard).
   */
  async updateStatus(
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateProposalStatusDto,
  ) {
    const current = await this.applyExpiry(
      await this.findScoped(currentUser, id),
    );

    const allowed = ALLOWED_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException('Transição de status inválida.');
    }
    if (
      dto.status === ProposalStatus.REJECTED &&
      !dto.rejectionReason?.trim()
    ) {
      throw new BadRequestException('Informe o motivo da recusa.');
    }

    const now = new Date();
    const historyEntry = { status: dto.status, changedAt: now, note: dto.note };
    const statusHistory = [...current.statusHistory, historyEntry];

    if (dto.status === ProposalStatus.ACCEPTED) {
      return this.prisma.$transaction(async (tx) => {
        const fresh = await tx.proposal.findUnique({ where: { id } });
        if (!fresh || !OPEN_STATUSES.includes(fresh.status)) {
          throw new ConflictException('Esta proposta já foi decidida.');
        }

        const project = await tx.project.create({
          data: {
            name: fresh.name,
            type: fresh.type,
            customType: fresh.customType,
            areaSqm: fresh.areaSqm,
            clientId: fresh.clientId,
            clientName: fresh.clientName,
            services: fresh.services,
            customServiceLabel: fresh.customServiceLabel,
            complexity: fresh.complexity,
            constructionBudget: fresh.constructionBudget,
            feeModel: fresh.feeModel,
            feeRate: fresh.feeRate,
            estimatedHours: fresh.estimatedHours,
            feeAmount: fresh.feeAmount,
            paymentMethod: fresh.paymentMethod,
            installments: fresh.installments,
            companyId: fresh.companyId,
            deletedAt: null,
          },
        });

        return tx.proposal.update({
          where: { id },
          data: {
            status: ProposalStatus.ACCEPTED,
            decidedAt: now,
            convertedProjectId: project.id,
            statusHistory,
          },
          include: { convertedProject: true },
        });
      });
    }

    return this.prisma.proposal.update({
      where: { id },
      data: {
        status: dto.status,
        statusHistory,
        ...(dto.status === ProposalStatus.SENT && !current.sentAt
          ? { sentAt: now }
          : {}),
        ...(dto.status === ProposalStatus.REJECTED
          ? { decidedAt: now, rejectionReason: dto.rejectionReason }
          : {}),
      },
    });
  }

  async remove(currentUser: AuthenticatedUser, id: string) {
    const proposal = await this.findScoped(currentUser, id);
    if (proposal.status !== ProposalStatus.DRAFT) {
      throw new BadRequestException(
        'Só é possível excluir propostas em rascunho.',
      );
    }
    return this.prisma.proposal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Uma SENT/NEGOTIATING cuja validade já passou é lida como EXPIRED — sem
   * depender de nenhum job/cron (não existe infra de scheduler no backend
   * hoje), o status é corrigido no próprio momento da leitura. */
  private async applyExpiry(proposal: Proposal): Promise<Proposal> {
    if (
      !OPEN_STATUSES.includes(proposal.status) ||
      !proposal.validUntil ||
      proposal.validUntil > new Date()
    ) {
      return proposal;
    }

    return this.prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: ProposalStatus.EXPIRED,
        statusHistory: [
          ...proposal.statusHistory,
          { status: ProposalStatus.EXPIRED, changedAt: new Date() },
        ],
      },
    });
  }

  private async findScoped(
    currentUser: AuthenticatedUser,
    id: string,
  ): Promise<Proposal> {
    const proposal = await this.prisma.proposal.findUnique({ where: { id } });
    if (!proposal || proposal.deletedAt) {
      throw new NotFoundException('Proposta não encontrada.');
    }
    if (
      currentUser.role !== UserRole.VINCEL_ADMIN &&
      proposal.companyId !== currentUser.companyId
    ) {
      throw new NotFoundException('Proposta não encontrada.');
    }
    return proposal;
  }
}
