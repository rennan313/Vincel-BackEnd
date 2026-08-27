import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

// Multipart form fields alongside the uploaded file — see
// ProjectDocumentsController.upload for the file itself (@UploadedFile()).
export class CreateDocumentDto {
  @ApiProperty({ example: 'Planta baixa - pavimento térreo' })
  @IsString()
  @MinLength(1, { message: 'Informe o nome do documento.' })
  name: string;

  @ApiProperty({ example: 'Planta' })
  @IsString()
  @MinLength(1, { message: 'Informe o tipo do documento.' })
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
