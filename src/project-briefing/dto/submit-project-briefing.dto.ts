import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class BriefingAnswerDto {
  @ApiProperty({ description: 'id da BriefingQuestion sendo respondida.' })
  @IsMongoId()
  questionId: string;

  @ApiPropertyOptional({
    description: 'Resposta para TEXT/TEXTAREA/NUMBER/DATE.',
  })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({ type: [String], description: 'Resposta para LINKS.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];
}

export class SubmitProjectBriefingDto {
  @ApiProperty({ type: [BriefingAnswerDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Responda pelo menos uma pergunta.' })
  @ValidateNested({ each: true })
  @Type(() => BriefingAnswerDto)
  answers: BriefingAnswerDto[];
}
