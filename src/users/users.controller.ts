import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.VINCEL_ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista os usuários do escritório, paginada e com busca por nome/e-mail.',
  })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListUsersDto,
  ) {
    return this.usersService.list(currentUser, query);
  }

  @Post()
  @ApiOperation({ summary: 'Cria um usuário no escritório.' })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(currentUser, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita nome, e-mail e/ou perfil de um usuário.' })
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(currentUser, id, dto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reativa um usuário.' })
  activate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.usersService.setActive(currentUser, id, true);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desativa um usuário.' })
  deactivate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.usersService.setActive(currentUser, id, false);
  }
}
