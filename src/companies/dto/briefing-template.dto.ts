import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
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

  @ApiProperty({ type: [BriefingQuestionDto] })
  @IsArray()
  @ArrayMinSize(1, {
    message: 'O formulário precisa de pelo menos uma pergunta.',
  })
  @ValidateNested({ each: true })
  @Type(() => BriefingQuestionDto)
  questions: BriefingQuestionDto[];
}
