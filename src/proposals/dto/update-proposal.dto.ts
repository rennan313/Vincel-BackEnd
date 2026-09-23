import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProposalDto } from './create-proposal.dto';

// Sem `status` aqui de propósito — a transição de status (com seus efeitos
// colaterais: sentAt/decidedAt, criação do Project ao aceitar) é sempre
// feita via PATCH /proposals/:id/status (UpdateProposalStatusDto), nunca
// por este endpoint genérico de edição de campos.
export class UpdateProposalDto extends PartialType(
  OmitType(CreateProposalDto, ['companyId'] as const),
) {}
