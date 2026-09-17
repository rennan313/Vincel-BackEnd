import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CompaniesService } from './companies.service';
import { ReplaceBriefingQuestionsDto } from './dto/replace-briefing-questions.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

const MAX_LOGO_UPLOAD_BYTES = 5 * 1024 * 1024;

@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get(':id/public')
  @ApiOperation({
    summary:
      'Perfil público de um escritório (nome, logo, contato) — sem autenticação, usado pela página de convite de clientes.',
  })
  getPublicProfile(@Param('id') id: string) {
    return this.companiesService.getPublicProfile(id);
  }

  @Get(':id/logo')
  @ApiOperation({
    summary:
      'Imagem do logo de um escritório — sem autenticação, é o que Company.logoUrl aponta para.',
  })
  async getLogo(@Param('id') id: string, @Res() res: Response) {
    const { stream } = await this.companiesService.getLogoStream(id);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300');
    stream.pipe(res);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Perfil completo do escritório do usuário logado.' })
  getOwnProfile(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.companiesService.getOwnProfile(currentUser);
  }

  @Patch('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Edita nome, e-mail, telefone e endereço do escritório do usuário logado.',
  })
  updateOwnProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.updateOwnProfile(currentUser, dto);
  }

  @Post('me/logo')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_LOGO_UPLOAD_BYTES } }),
  )
  @ApiOperation({
    summary:
      'Envia o logo do escritório (PNG/JPEG/WEBP, até 5MB) — redimensionado no servidor, nunca a URL crua.',
  })
  uploadLogo(
    @CurrentUser() currentUser: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Req() request: Request,
  ) {
    return this.companiesService.uploadLogo(
      currentUser,
      file,
      `${request.protocol}://${request.get('host')}`,
    );
  }

  @Delete('me/logo')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove o logo do escritório do usuário logado.' })
  removeLogo(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.companiesService.removeLogo(currentUser);
  }

  @Get('me/briefing-questions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Lista as perguntas do formulário de briefing do escritório (semeia os padrões na primeira vez).',
  })
  listBriefingQuestions(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.companiesService.listOwnBriefingQuestions(currentUser);
  }

  @Put('me/briefing-questions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Substitui a lista inteira de perguntas do briefing (adicionar/editar/remover/reordenar).',
  })
  replaceBriefingQuestions(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ReplaceBriefingQuestionsDto,
  ) {
    return this.companiesService.replaceOwnBriefingQuestions(currentUser, dto);
  }
}
