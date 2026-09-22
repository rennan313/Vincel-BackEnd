import { Injectable } from '@nestjs/common';
import { ProjectRequestStatus, ProjectStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { resolveCompanyId } from '../common/company-scope';
import { PrismaService } from '../prisma/prisma.service';

// Every ProjectStatus, so the response always carries all four counts (0
// for ones with no projects) rather than only whichever statuses happen to
// have at least one row — the front shouldn't have to guess which keys
// might be missing.
const ALL_STATUSES = Object.values(ProjectStatus);

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Plain counts and sums scoped to the current company — no derived score
   * or "health index": every number here is either a row count or a sum of
   * a field the escritório itself entered (feeAmount, expense amount).
   */
  async summary(currentUser: AuthenticatedUser) {
    const companyId = resolveCompanyId(currentUser);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      statusCounts,
      activeClients,
      pipelineFee,
      monthExpenses,
      newProjectRequests,
    ] = await Promise.all([
      this.prisma.project.groupBy({
        by: ['status'],
        where: { companyId, deletedAt: null },
        _count: true,
      }),
      this.prisma.client.count({
        where: { companyId, deletedAt: null, active: true },
      }),
      this.prisma.project.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: ProjectStatus.in_progress,
        },
        _sum: { feeAmount: true },
      }),
      this.prisma.projectExpense.aggregate({
        where: {
          project: { companyId, deletedAt: null },
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.projectRequest.count({
        where: { companyId, status: ProjectRequestStatus.new },
      }),
    ]);

    const projectsByStatus = Object.fromEntries(
      ALL_STATUSES.map((status) => [
        status,
        statusCounts.find((row) => row.status === status)?._count ?? 0,
      ]),
    ) as Record<ProjectStatus, number>;

    return {
      projectsByStatus,
      activeClients,
      pipelineFeeAmount: pipelineFee._sum.feeAmount ?? 0,
      monthExpenses: monthExpenses._sum.amount ?? 0,
      newProjectRequests,
    };
  }
}
