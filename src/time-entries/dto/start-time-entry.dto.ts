import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsString, MinLength } from 'class-validator';

export class StartTimeEntryDto {
  @ApiProperty({ example: 'Criar tela de orçamento' })
  @IsString()
  @MinLength(1, { message: 'Informe a atividade.' })
  activity: string;

  @ApiProperty({ description: 'Projeto ao qual essa atividade pertence.' })
  @IsMongoId()
  projectId: string;
}
