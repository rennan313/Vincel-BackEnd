import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { SubmitProjectBriefingDto } from '../project-briefing/dto/submit-project-briefing.dto';
import { UploadBriefingPhotoDto } from '../project-briefing/dto/upload-briefing-photo.dto';
import { ProjectBriefingService } from '../project-briefing/project-briefing.service';
import { ClientAuthService } from './client-auth.service';
import { CurrentClient } from './decorators/current-client.decorator';
import { ClientLoginDto } from './dto/client-login.dto';
import { CreateProjectRequestDto } from './dto/create-project-request.dto';
import { UpdateClientPasswordDto } from './dto/update-client-password.dto';
import { ClientJwtAuthGuard } from './guards/client-jwt-auth.guard';
import type { AuthenticatedClient } from './strategies/client-jwt.strategy';

const MAX_PHOTO_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Portal de cliente — autenticação e leitura própria (projetos, cadastro),
 * separada da autenticação de equipe (AuthController/vincel-api staff).
 * Sem recuperação de senha por e-mail por enquanto: quem provisiona/reseta
 * a senha de um cliente é o escritório, via PATCH /clients/:id. */
@ApiTags('client-auth')
@Controller('client-auth')
export class ClientAuthController {
  constructor(
    private readonly clientAuthService: ClientAuthService,
    private readonly projectBriefingService: ProjectBriefingService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica um cliente com e-mail e senha.' })
  login(@Body() dto: ClientLoginDto) {
    return this.clientAuthService.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(ClientJwtAuthGuard)
  @ApiOperation({ summary: 'Dados de cadastro do cliente autenticado.' })
  me(@CurrentClient() currentClient: AuthenticatedClient) {
    return this.clientAuthService.me(currentClient);
  }

  @Get('me/projects')
  @ApiBearerAuth()
  @UseGuards(ClientJwtAuthGuard)
  @ApiOperation({ summary: 'Projetos do cliente autenticado.' })
  myProjects(@CurrentClient() currentClient: AuthenticatedClient) {
    return this.clientAuthService.myProjects(currentClient);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(ClientJwtAuthGuard)
  @ApiOperation({ summary: 'Altera a senha do cliente autenticado.' })
  async updatePassword(
    @CurrentClient() currentClient: AuthenticatedClient,
    @Body() dto: UpdateClientPasswordDto,
  ) {
    await this.clientAuthService.updatePassword(currentClient, dto);
  }

  @Post('me/project-requests')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @UseGuards(ClientJwtAuthGuard)
  @ApiOperation({
    summary:
      'Solicita um projeto — vira um lead para o escritório entrar em contato (GET /project-requests).',
  })
  createProjectRequest(
    @CurrentClient() currentClient: AuthenticatedClient,
    @Body() dto: CreateProjectRequestDto,
  ) {
    return this.clientAuthService.createProjectRequest(currentClient, dto);
  }

  @Get('me/projects/:projectId/briefing')
  @ApiBearerAuth()
  @UseGuards(ClientJwtAuthGuard)
  @ApiOperation({
    summary:
      'Briefing (perguntas + respostas) de um projeto vinculado ao cliente autenticado.',
  })
  getBriefing(
    @CurrentClient() currentClient: AuthenticatedClient,
    @Param('projectId') projectId: string,
  ) {
    return this.projectBriefingService.getForClient(currentClient, projectId);
  }

  @Post('me/projects/:projectId/briefing')
  @ApiBearerAuth()
  @UseGuards(ClientJwtAuthGuard)
  @ApiOperation({
    summary:
      'Envia (ou reenvia) as respostas do briefing de um projeto vinculado ao cliente autenticado.',
  })
  submitBriefing(
    @CurrentClient() currentClient: AuthenticatedClient,
    @Param('projectId') projectId: string,
    @Body() dto: SubmitProjectBriefingDto,
  ) {
    return this.projectBriefingService.submitForClient(
      currentClient,
      projectId,
      dto,
    );
  }

  @Post('me/projects/:projectId/briefing/photos')
  @ApiBearerAuth()
  @UseGuards(ClientJwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_PHOTO_UPLOAD_BYTES } }),
  )
  @ApiOperation({
    summary:
      'Envia uma foto de item/móvel para uma pergunta do tipo PHOTOS, no briefing de um projeto vinculado ao cliente autenticado.',
  })
  uploadBriefingPhoto(
    @CurrentClient() currentClient: AuthenticatedClient,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadBriefingPhotoDto,
    @Req() request: Request,
  ) {
    return this.projectBriefingService.uploadPhotoForClient(
      currentClient,
      projectId,
      dto.questionId,
      file,
      `${request.protocol}://${request.get('host')}`,
    );
  }
}
