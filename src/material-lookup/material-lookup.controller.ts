import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LookupMaterialDto } from './dto/lookup-material.dto';
import { MaterialLookupService } from './material-lookup.service';

@ApiTags('material-lookup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('material-lookup')
export class MaterialLookupController {
  constructor(private readonly materialLookupService: MaterialLookupService) {}

  @Post()
  @ApiOperation({
    summary:
      'Busca os dados de um material a partir do link do produto em um fornecedor cadastrado.',
  })
  lookup(@Body() dto: LookupMaterialDto) {
    return this.materialLookupService.lookup(dto.url);
  }
}
