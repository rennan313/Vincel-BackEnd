import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token emitido no login.' })
  @IsString()
  @MinLength(1, { message: 'Informe o refresh token.' })
  refreshToken: string;
}
