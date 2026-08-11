import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
