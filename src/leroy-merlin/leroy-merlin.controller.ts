import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchLeroyMerlinProductsDto } from './dto/search-leroy-merlin-products.dto';
import { LeroyMerlinService } from './leroy-merlin.service';

@ApiTags('leroy-merlin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leroy-merlin')
export class LeroyMerlinController {
  constructor(private readonly leroyMerlinService: LeroyMerlinService) {}

  @Get('products')
  @ApiOperation({
    summary: 'Busca produtos no parceiro Leroy Merlin por nome.',
  })
  search(@Query() query: SearchLeroyMerlinProductsDto) {
    return this.leroyMerlinService.searchProducts(
      query.query,
      query.count,
      query.page,
    );
  }
}
