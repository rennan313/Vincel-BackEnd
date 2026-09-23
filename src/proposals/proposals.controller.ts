import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { ListProposalsDto } from './dto/list-proposals.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { UpdateProposalStatusDto } from './dto/update-proposal-status.dto';
import { ProposalsService } from './proposals.service';

@ApiTags('proposals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('proposals')
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista as propostas comerciais do escritório, paginada e com busca por nome/cliente/status.',
  })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListProposalsDto,
  ) {
    return this.proposalsService.list(currentUser, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca uma proposta pelo id.' })
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.proposalsService.findOne(currentUser, id);
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma proposta comercial (nasce em Rascunho).' })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateProposalDto,
  ) {
    return this.proposalsService.create(currentUser, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edita os campos de uma proposta ainda não decidida.',
  })
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProposalDto,
  ) {
    return this.proposalsService.update(currentUser, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary:
      'Transiciona o status da proposta — aceitar cria o Project correspondente.',
  })
  updateStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProposalStatusDto,
  ) {
    return this.proposalsService.updateStatus(currentUser, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove (soft-delete) uma proposta em rascunho.' })
  remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.proposalsService.remove(currentUser, id);
  }
}
