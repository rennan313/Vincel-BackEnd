import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchTelhaNorteProductsDto } from './dto/search-telha-norte-products.dto';
import { TelhaNorteService } from './telha-norte.service';

@ApiTags('telha-norte')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('telha-norte')
export class TelhaNorteController {
  constructor(private readonly telhaNorteService: TelhaNorteService) {}

  @Get('products')
  @ApiOperation({
    summary: 'Busca produtos no parceiro Telha Norte por nome.',
  })
  search(@Query() query: SearchTelhaNorteProductsDto) {
    return this.telhaNorteService.searchProducts(
      query.query,
      query.count,
      query.page,
    );
  }
}
