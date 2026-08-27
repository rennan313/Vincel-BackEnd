import { PartialType } from '@nestjs/swagger';
import { CreateDocumentDto } from './create-document.dto';

// Metadata only (name/type/notes) — replacing the file itself means
// removing this document and adding a new one.
export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {}
