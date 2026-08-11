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
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatePriceDto } from './dto/create-price.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ListPricesDto } from './dto/list-prices.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VINCEL_ADMIN)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os produtos, paginada e com busca por nome/SKU.',
  })
  list(@Query() query: ListProductsDto) {
    return this.productsService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um produto pelo id.' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra um produto.' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita um produto.' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reativa um produto.' })
  activate(@Param('id') id: string) {
    return this.productsService.setActive(id, true);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desativa um produto.' })
  deactivate(@Param('id') id: string) {
    return this.productsService.setActive(id, false);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove (soft delete) um produto.' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Get(':id/prices')
  @ApiOperation({
    summary:
      'Histórico de preços do produto (mais recente primeiro), opcionalmente filtrado por fornecedor.',
  })
  listPrices(@Param('id') id: string, @Query() query: ListPricesDto) {
    return this.productsService.listPrices(id, query);
  }

  @Post(':id/prices')
  @ApiOperation({
    summary:
      'Registra o preço praticado por um fornecedor para o produto (cria uma nova versão; o histórico anterior não é alterado).',
  })
  createPrice(@Param('id') id: string, @Body() dto: CreatePriceDto) {
    return this.productsService.createPrice(id, dto);
  }
}
