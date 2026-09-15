import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, type Project } from '@prisma/client';
import { CompaniesService } from '../companies/companies.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitProjectBriefingDto } from './dto/submit-project-briefing.dto';

@Injectable()
export class ProjectBriefingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companiesService: CompaniesService,
  ) {}

  /** Backs the public briefing page — no authenticated user, so this
   * exposes only what a client filling out their own project's briefing
   * needs: the project/client names, the office's branding, its current
   * question list, and whatever they may have already answered (to
   * prefill a re-visit). */
  async getPublicContext(projectId: string) {
    const project = await this.findActiveProject(projectId);
    const [company, questions, briefing] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: project.companyId } }),
      this.companiesService.listBriefingQuestions(project.companyId),
      this.prisma.projectBriefing.findUnique({ where: { projectId } }),
    ]);

    return {
      project: {
        id: project.id,
        name: project.name,
        clientName: project.clientName,
      },
      company: { name: company?.name ?? '', logoUrl: company?.logoUrl ?? null },
      questions,
      briefing,
    };
  }

  async submitPublic(projectId: string, dto: SubmitProjectBriefingDto) {
    const project = await this.findActiveProject(projectId);

    // Answers for a question this company no longer has are dropped
    // rather than stored orphaned — the questionId came from the form the
    // client was just shown, but a submission racing an admin edit could
    // still carry a stale one.
    const validQuestionIds = new Set(
      (
        await this.companiesService.listBriefingQuestions(project.companyId)
      ).map((q) => q.id),
    );
    const answers = dto.answers
      .filter((answer) => validQuestionIds.has(answer.questionId))
      .map((answer) => ({
        questionId: answer.questionId,
        value: answer.value,
        values: answer.values ?? [],
      }));

    return this.prisma.projectBriefing.upsert({
      where: { projectId },
      create: { projectId, answers, submittedAt: new Date() },
      update: { answers, submittedAt: new Date() },
    });
  }

  /** In-app read for the office — same company-scoping every other
   * project sub-resource uses. `briefing` is null (not 404) when the
   * project exists but the client hasn't submitted one yet. */
  async getForCompany(currentUser: AuthenticatedUser, projectId: string) {
    const project = await this.assertProjectScoped(currentUser, projectId);
    const [questions, briefing] = await Promise.all([
      this.companiesService.listBriefingQuestions(project.companyId),
      this.prisma.projectBriefing.findUnique({ where: { projectId } }),
    ]);
    return { questions, briefing };
  }

  private async findActiveProject(projectId: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.deletedAt) {
      throw new NotFoundException('Projeto não encontrado.');
    }
    return project;
  }

  private async assertProjectScoped(
    currentUser: AuthenticatedUser,
    projectId: string,
  ): Promise<Project> {
    const project = await this.findActiveProject(projectId);
    if (
      currentUser.role !== UserRole.VINCEL_ADMIN &&
      project.companyId !== currentUser.companyId
    ) {
      throw new NotFoundException('Projeto não encontrado.');
    }
    return project;
  }
}
