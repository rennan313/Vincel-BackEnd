import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsString, MinLength, ValidateNested } from 'class-validator';
import { BriefingQuestionDto } from './briefing-question.dto';

export class BriefingTemplateDto {
  @ApiProperty({ example: 'Residencial' })
  @IsString()
  @MinLength(1, { message: 'Informe o nome do template.' })
  name: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Tipos de projeto (ProjectType.name) que este template atende. Ignorado para o template padrão, que sempre cobre os tipos não atribuídos a nenhum outro.',
  })
  @IsArray()
  @IsString({ each: true })
  projectTypes: string[];

  // No @ArrayMinSize here: creating the template itself ("Criar
  // formulário") happens before any question exists yet — questions are
  // added to it afterwards, in a later PUT (see BriefingTemplatesCard).
  @ApiProperty({ type: [BriefingQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BriefingQuestionDto)
  questions: BriefingQuestionDto[];
}
