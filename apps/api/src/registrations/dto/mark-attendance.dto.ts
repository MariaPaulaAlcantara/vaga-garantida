import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class MarkAttendanceDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  attended!: boolean;
}
