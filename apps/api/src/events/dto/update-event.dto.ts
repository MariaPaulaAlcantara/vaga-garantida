import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '@vaga-garantida/database';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateEventDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({ enum: [1, 2] })
  @IsOptional()
  @IsIn([1, 2])
  opensDaysBefore?: number;

  @ApiPropertyOptional({ example: '20:00' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Horário deve estar no formato HH:mm' })
  closesAtTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  promotedConfirmHours?: number;
}
