import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { BriefingQuestionDto } from './briefing-question.dto';

export class ReplaceBriefingQuestionsDto {
  @ApiProperty({ type: [BriefingQuestionDto] })
  @IsArray()
  @ArrayMinSize(1, {
    message: 'O formulário precisa de pelo menos uma pergunta.',
  })
  @ValidateNested({ each: true })
  @Type(() => BriefingQuestionDto)
  questions: BriefingQuestionDto[];
}
