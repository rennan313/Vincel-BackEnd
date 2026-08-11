import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { Profile } from 'passport-google-oauth20';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Auto credenciamento — cria o escritório (Company) e seu primeiro usuário ADMIN.',
  })
  @ApiResponse({ status: 201, description: 'Conta criada.' })
  @ApiResponse({
    status: 409,
    description: 'E-mail ou CNPJ/CPF já cadastrado.',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Retorna o usuário autenticado.' })
  me(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.authService.me(currentUser.id);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary:
      'Inicia o login/cadastro com Google. Para cadastro, passe ?state= com o companyDocument/companyDocumentType em base64 JSON.',
  })
  googleAuth() {
    // GoogleAuthGuard redirects to Google's consent screen — never reaches here.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const state =
      typeof req.query.state === 'string' ? req.query.state : undefined;

    try {
      const { accessToken } = await this.authService.loginOrRegisterWithGoogle(
        req.user as Profile,
        state,
      );
      const redirectUrl = new URL('/auth/callback', frontendUrl);
      redirectUrl.searchParams.set('token', accessToken);
      return res.redirect(redirectUrl.toString());
    } catch (error) {
      const redirectUrl = new URL('/register', frontendUrl);
      redirectUrl.searchParams.set(
        'googleError',
        error instanceof Error
          ? error.message
          : 'Não foi possível continuar com Google.',
      );
      return res.redirect(redirectUrl.toString());
    }
  }
}
