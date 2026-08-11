import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { Project } from '@prisma/client';

// Mirrors vincel-front's SERVICE_LABELS (src/features/projects/create/serviceCatalog.ts)
// — services are stored as ServiceKey[], not display labels.
const SERVICE_LABELS: Record<string, string> = {
  estudo_preliminar: 'Estudo preliminar',
  anteprojeto: 'Anteprojeto',
  projeto_legal: 'Projeto legal',
  projeto_executivo: 'Projeto executivo',
  projeto_estrutural: 'Projeto estrutural',
  projeto_eletrico: 'Projeto elétrico',
  projeto_hidraulico: 'Projeto hidráulico',
  projeto_luminotecnico: 'Luminotécnico',
  projeto_interiores: 'Projeto de interiores',
  paisagismo: 'Paisagismo',
  compatibilizacao: 'Compatibilização',
  acompanhamento_obra: 'Acomp. de obra',
  consultoria: 'Consultoria',
  outro: 'Outro',
};

// Mirrors vincel-front's locales/pt.json projects.status.*.
const STATUS_LABELS: Record<string, string> = {
  in_progress: 'Em andamento',
  completed: 'Concluído',
  paused: 'Pausado',
  canceled: 'Cancelado',
};

// Mirrors vincel-front's OverviewTab/ProjectSummaryCards COMPLEXITY_LABEL.
const COMPLEXITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
};

// Mirrors vincel-front's FinancialTab FEE_MODEL_LABEL.
const FEE_MODEL_LABELS: Record<string, string> = {
  per_sqm: 'Por m²',
  per_hour: 'Por hora',
};

// Mirrors vincel-front's StepFinancial payment method labels.
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'À vista',
  installments: 'Parcelado',
  by_phase: 'Por etapa',
  monthly: 'Mensal',
  custom: 'Personalizado',
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });

function formatCurrency(value: number | null | undefined): string | null {
  return value == null ? null : currencyFormatter.format(value);
}

function formatDate(value: Date | null | undefined): string | null {
  return value == null ? null : dateFormatter.format(value);
}

@Injectable()
export class ProjectPdfService {
  render(project: Project): PDFKit.PDFDocument {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    doc.fontSize(20).fillColor('#111').text(project.name);
    doc
      .fontSize(11)
      .fillColor('#555')
      .text(
        [STATUS_LABELS[project.status] ?? project.status, project.type]
          .filter(Boolean)
          .join(' · '),
      );
    doc.moveDown(1.5);

    this.section(doc, 'Cliente', [project.clientName]);

    const addressLine = this.formatAddress(project.address);
    if (addressLine) this.section(doc, 'Endereço', [addressLine]);

    const infoLines = [
      project.areaSqm != null ? `Área: ${project.areaSqm} m²` : null,
      project.customType ? `Descrição do tipo: ${project.customType}` : null,
    ].filter((line): line is string => Boolean(line));
    if (infoLines.length > 0)
      this.section(doc, 'Informações gerais', infoLines);

    const serviceLines = project.services.map(
      (key) => SERVICE_LABELS[key] ?? key,
    );
    if (project.customServiceLabel)
      serviceLines.push(project.customServiceLabel);
    if (serviceLines.length > 0) this.section(doc, 'Serviços', serviceLines);

    const componentLines = project.components.map((component) => {
      const parts = [component.name, `${component.quantity}x`];
      if (component.areaSqm != null) parts.push(`${component.areaSqm} m²`);
      if (component.note) parts.push(component.note);
      return parts.join(' — ');
    });
    if (componentLines.length > 0)
      this.section(doc, 'Componentes', componentLines);

    const planningLines = [
      project.complexity
        ? `Complexidade: ${COMPLEXITY_LABELS[project.complexity] ?? project.complexity}`
        : null,
      ...project.planningPhases.map(
        (phase) => `${phase.name}: ${phase.estimatedDays} dias`,
      ),
    ].filter((line): line is string => Boolean(line));
    if (planningLines.length > 0)
      this.section(doc, 'Planejamento', planningLines);

    const financialLines = [
      formatCurrency(project.constructionBudget) &&
        `Orçamento de obra: ${formatCurrency(project.constructionBudget)}`,
      project.feeModel &&
        `Honorários: ${FEE_MODEL_LABELS[project.feeModel] ?? project.feeModel}${
          project.feeRate != null ? ` (${formatCurrency(project.feeRate)})` : ''
        }`,
      project.feeModel === 'per_hour' &&
        project.estimatedHours != null &&
        `Horas estimadas: ${project.estimatedHours}h`,
      formatCurrency(project.feeAmount) &&
        `Valor total de honorários: ${formatCurrency(project.feeAmount)}`,
      project.paymentMethod &&
        `Forma de pagamento: ${PAYMENT_METHOD_LABELS[project.paymentMethod] ?? project.paymentMethod}`,
    ].filter((line): line is string => Boolean(line));
    if (financialLines.length > 0)
      this.section(doc, 'Financeiro', financialLines);

    const installmentLines = project.installments.map(
      (installment) =>
        `${installment.label}: ${formatCurrency(installment.amount)}`,
    );
    if (installmentLines.length > 0)
      this.section(doc, 'Parcelas', installmentLines);

    const scheduleLines = [
      formatDate(project.startDate) &&
        `Início: ${formatDate(project.startDate)}`,
      formatDate(project.endDate) &&
        `Término previsto: ${formatDate(project.endDate)}`,
    ].filter((line): line is string => Boolean(line));
    if (scheduleLines.length > 0)
      this.section(doc, 'Cronograma', scheduleLines);

    doc
      .fontSize(8)
      .fillColor('#999')
      .text(`Gerado em ${dateFormatter.format(new Date())}`, {
        align: 'right',
      });

    return doc;
  }

  private section(
    doc: PDFKit.PDFDocument,
    title: string,
    lines: string[],
  ): void {
    doc.fontSize(13).fillColor('#111').text(title, { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#333');
    for (const line of lines) doc.text(line);
    doc.moveDown();
  }

  private formatAddress(address: Project['address']): string | null {
    if (!address) return null;
    const street = [address.street, address.number].filter(Boolean).join(', ');
    const line = [
      street,
      address.complement,
      address.neighborhood,
      [address.city, address.state].filter(Boolean).join(' - '),
      address.zip,
    ]
      .filter(Boolean)
      .join(' · ');
    return line || null;
  }
}
