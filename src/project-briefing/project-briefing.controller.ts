import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
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
import type { Request, Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { SubmitProjectBriefingDto } from './dto/submit-project-briefing.dto';
import { UploadBriefingPhotoDto } from './dto/upload-briefing-photo.dto';
import { ProjectBriefingService } from './project-briefing.service';

const MAX_PHOTO_UPLOAD_BYTES = 10 * 1024 * 1024;

@ApiTags('project-briefing')
@Controller('projects/:projectId/briefing')
export class ProjectBriefingController {
  constructor(
    private readonly projectBriefingService: ProjectBriefingService,
  ) {}

  @Get('public')
  @ApiOperation({
    summary:
      'Contexto do brifing público de um projeto (projeto/cliente, marca do escritório, perguntas e respostas já dadas) — sem autenticação.',
  })
  getPublicContext(@Param('projectId') projectId: string) {
    return this.projectBriefingService.getPublicContext(projectId);
  }

  @Post('public')
  @ApiOperation({
    summary:
      'Envia (ou reenvia) as respostas do brifing deste projeto — sem autenticação.',
  })
  submitPublic(
    @Param('projectId') projectId: string,
    @Body() dto: SubmitProjectBriefingDto,
  ) {
    return this.projectBriefingService.submitPublic(projectId, dto);
  }

  @Post('public/photos')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_PHOTO_UPLOAD_BYTES } }),
  )
  @ApiOperation({
    summary:
      'Envia uma foto de item/móvel para uma pergunta do tipo PHOTOS — sem autenticação, uma chamada por foto.',
  })
  uploadPublicPhoto(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadBriefingPhotoDto,
    @Req() request: Request,
  ) {
    return this.projectBriefingService.uploadPublicPhoto(
      projectId,
      dto.questionId,
      file,
      `${request.protocol}://${request.get('host')}`,
    );
  }

  @Get('photos/:questionId/:fileId')
  @ApiOperation({
    summary:
      'Imagem de uma foto de brifing enviada pelo cliente — sem autenticação.',
  })
  async getPhoto(
    @Param('projectId') projectId: string,
    @Param('questionId') questionId: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const { stream } = await this.projectBriefingService.getPhotoStream(
      projectId,
      questionId,
      fileId,
    );
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=300');
    stream.pipe(res);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Lê o brifing (perguntas + respostas) deste projeto.',
  })
  getForCompany(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ) {
    return this.projectBriefingService.getForCompany(currentUser, projectId);
  }
}
