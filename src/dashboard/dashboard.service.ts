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

// Past this many distinct project types, the rest fold into "Outros" — a
// donut with 7+ slices stops being readable "at a glance" (see the dataviz
// skill's series-count ladder). The type catalog itself only seeds 7 names,
// so this only ever trims the long tail of custom ("outro") types.
const MAX_TYPE_SLICES = 5;
const MONTHS_OF_HISTORY = 6;

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** The last `count` calendar months as 'YYYY-MM' keys, oldest first,
 * including the current month — the front formats these into short
 * month/year labels itself (same "formatting is a front concern" split as
 * everywhere else in this codebase). */
function recentMonthKeys(count: number): string[] {
  const keys: string[] = [];
  const cursor = new Date();
  cursor.setUTCDate(1);
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(cursor);
    d.setUTCMonth(d.getUTCMonth() - i);
    keys.push(monthKey(d));
  }
  return keys;
}

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

  /**
   * Chart data for the "ritmo do escritório" section — a part-to-whole split
   * of the current catalog (projectsByType) and two single-series trends
   * over the last few months (new projects, honorários), kept as two
   * separate series rather than one dual-axis chart (count and R$ don't
   * share a scale — see the dataviz anti-pattern this avoids).
   */
  async charts(currentUser: AuthenticatedUser) {
    const companyId = resolveCompanyId(currentUser);
    const historyStart = new Date();
    historyStart.setUTCDate(1);
    historyStart.setUTCHours(0, 0, 0, 0);
    historyStart.setUTCMonth(
      historyStart.getUTCMonth() - (MONTHS_OF_HISTORY - 1),
    );

    const [typeCounts, recentProjects] = await Promise.all([
      this.prisma.project.groupBy({
        by: ['type'],
        where: { companyId, deletedAt: null },
        _count: true,
      }),
      this.prisma.project.findMany({
        where: { companyId, deletedAt: null, createdAt: { gte: historyStart } },
        select: { createdAt: true, feeAmount: true },
      }),
    ]);

    // Alphabetical as the tiebreaker — Mongo's groupBy makes no ordering
    // guarantee among equal counts, so without this the "top 5" (and which
    // types fold into "Outros") could shuffle between two otherwise
    // identical requests.
    const sortedTypes = typeCounts
      .map((row) => ({ type: row.type, count: row._count }))
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
    const projectsByType = sortedTypes.slice(0, MAX_TYPE_SLICES);
    const otherCount = sortedTypes
      .slice(MAX_TYPE_SLICES)
      .reduce((sum, row) => sum + row.count, 0);
    if (otherCount > 0) {
      projectsByType.push({ type: 'Outros', count: otherCount });
    }

    const months = recentMonthKeys(MONTHS_OF_HISTORY);
    const monthlyNewProjects = months.map((month) => ({
      month,
      count: recentProjects.filter((p) => monthKey(p.createdAt) === month)
        .length,
    }));
    const monthlyFeeAmount = months.map((month) => ({
      month,
      amount: recentProjects
        .filter((p) => monthKey(p.createdAt) === month)
        .reduce((sum, p) => sum + (p.feeAmount ?? 0), 0),
    }));

    return { projectsByType, monthlyNewProjects, monthlyFeeAmount };
  }
}
