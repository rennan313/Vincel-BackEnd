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
import { CreatePriceDto } from './dto/create-price.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ListPricesDto } from './dto/list-prices.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

// Every user reads/writes within their own escritório's private catalog
// (companyId-scoped) — no VINCEL_ADMIN gate needed for that. VINCEL_ADMIN
// additionally manages the global catalog (companyId null), enforced
// inside ProductsService rather than at the route level, since the same
// endpoints serve both.
@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista os produtos do próprio escritório (ou o catálogo global, para VINCEL_ADMIN), paginada e com busca por nome/SKU.',
  })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListProductsDto,
  ) {
    return this.productsService.list(currentUser, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um produto pelo id.' })
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.productsService.findOne(currentUser, id);
  }

  @Post()
  @ApiOperation({
    summary:
      'Cadastra um produto no catálogo do próprio escritório (ou no catálogo global, para VINCEL_ADMIN).',
  })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(currentUser, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita um produto.' })
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(currentUser, id, dto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reativa um produto.' })
  activate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.productsService.setActive(currentUser, id, true);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desativa um produto.' })
  deactivate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.productsService.setActive(currentUser, id, false);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove (soft delete) um produto.' })
  remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.productsService.remove(currentUser, id);
  }

  @Get(':id/prices')
  @ApiOperation({
    summary:
      'Histórico de preços do produto (mais recente primeiro), opcionalmente filtrado por fornecedor.',
  })
  listPrices(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ListPricesDto,
  ) {
    return this.productsService.listPrices(currentUser, id, query);
  }

  @Post(':id/prices')
  @ApiOperation({
    summary:
      'Registra o preço praticado por um fornecedor para o produto (cria uma nova versão; o histórico anterior não é alterado).',
  })
  createPrice(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreatePriceDto,
  ) {
    return this.productsService.createPrice(currentUser, id, dto);
  }
}
