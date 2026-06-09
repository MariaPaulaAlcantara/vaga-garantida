import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'Maria Souza' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;
}
