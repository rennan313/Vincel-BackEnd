import { BriefingQuestionType } from '@prisma/client';

/**
 * Seeded into a company's BriefingQuestion list the first time it's
 * fetched with none saved yet (see CompaniesService.listBriefingQuestions)
 * — a starting point the admin is free to rename, reorder, add to, or
 * delete from via Configurações.
 */
export const DEFAULT_BRIEFING_QUESTIONS: Array<{
  section: string;
  label: string;
  type: BriefingQuestionType;
}> = [
  {
    section: 'Sobre o uso',
    label: 'Quantas pessoas vão usar o espaço?',
    type: BriefingQuestionType.NUMBER,
  },
  {
    section: 'Sobre o uso',
    label:
      'Como é a rotina de uso dos ambientes? (home office, recebe visitas, etc.)',
    type: BriefingQuestionType.TEXTAREA,
  },
  {
    section: 'Ambientes desejados',
    label: 'Quais ambientes/cômodos são prioridade?',
    type: BriefingQuestionType.TEXTAREA,
  },
  {
    section: 'Estilo e referências',
    label:
      'Qual estilo você prefere? (moderno, clássico, minimalista, industrial, outro)',
    type: BriefingQuestionType.TEXT,
  },
  {
    section: 'Estilo e referências',
    label: 'Quais são suas cores favoritas?',
    type: BriefingQuestionType.TEXT,
  },
  {
    section: 'Estilo e referências',
    label: 'Links de referência (Pinterest, Instagram, etc.)',
    type: BriefingQuestionType.LINKS,
  },
  {
    section: 'Materiais e restrições',
    label: 'Tem preferência de materiais ou acabamentos?',
    type: BriefingQuestionType.TEXTAREA,
  },
  {
    section: 'Materiais e restrições',
    label: 'Alguma restrição? (alergias, sustentabilidade, etc.)',
    type: BriefingQuestionType.TEXTAREA,
  },
  {
    section: 'Orçamento e prazo',
    label: 'Qual sua faixa de orçamento aproximada?',
    type: BriefingQuestionType.TEXT,
  },
  {
    section: 'Orçamento e prazo',
    label: 'Data desejada de início',
    type: BriefingQuestionType.DATE,
  },
  {
    section: 'Orçamento e prazo',
    label: 'Data desejada de conclusão',
    type: BriefingQuestionType.DATE,
  },
  {
    section: 'Observações finais',
    label: 'Alguma observação adicional?',
    type: BriefingQuestionType.TEXTAREA,
  },
];
