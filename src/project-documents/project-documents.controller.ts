import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ProjectDocumentsService } from './project-documents.service';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

@ApiTags('project-documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/documents')
export class ProjectDocumentsController {
  constructor(
    private readonly projectDocumentsService: ProjectDocumentsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista os documentos anexados a este projeto.' })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ) {
    return this.projectDocumentsService.list(currentUser, projectId);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Envia um arquivo e o anexa a este projeto.' })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }),
  )
  upload(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.projectDocumentsService.upload(currentUser, projectId, file, dto);
  }

  @Patch(':documentId')
  @ApiOperation({ summary: 'Edita nome/tipo/observação de um documento.' })
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.projectDocumentsService.update(
      currentUser,
      projectId,
      documentId,
      dto,
    );
  }

  @Get(':documentId/download')
  @ApiOperation({ summary: 'Baixa o arquivo de um documento deste projeto.' })
  async download(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Res() res: Response,
  ) {
    const { document, stream } = await this.projectDocumentsService.getDownloadTarget(
      currentUser,
      projectId,
      documentId,
    );

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(document.fileName)}"`,
    );
    stream.pipe(res);
  }

  @Delete(':documentId')
  @ApiOperation({ summary: 'Remove um documento deste projeto.' })
  remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.projectDocumentsService.remove(currentUser, projectId, documentId);
  }
}
