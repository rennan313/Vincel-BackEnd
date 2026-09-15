import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

// Multipart form field alongside the uploaded file — see
// ProjectBriefingController.uploadPublicPhoto for the file itself
// (@UploadedFile()).
export class UploadBriefingPhotoDto {
  @ApiProperty({
    description:
      'id da BriefingQuestion (tipo PHOTOS) que está sendo respondida.',
  })
  @IsMongoId()
  questionId: string;
}
