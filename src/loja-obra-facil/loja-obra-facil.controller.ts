import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchLojaObraFacilProductsDto } from './dto/search-loja-obra-facil-products.dto';
import { LojaObraFacilService } from './loja-obra-facil.service';

@ApiTags('loja-obra-facil')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('loja-obra-facil')
export class LojaObraFacilController {
  constructor(private readonly lojaObraFacilService: LojaObraFacilService) {}

  @Get('products')
  @ApiOperation({
    summary: 'Busca produtos no parceiro Loja Obra Fácil por nome.',
  })
  search(@Query() query: SearchLojaObraFacilProductsDto) {
    return this.lojaObraFacilService.searchProducts(query.query);
  }
}
