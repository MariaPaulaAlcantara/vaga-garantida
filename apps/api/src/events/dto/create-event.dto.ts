import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty()
  @IsDateString()
  startsAt!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  location!: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  capacity!: number;

  @ApiPropertyOptional({ default: 48 })
  @IsOptional()
  @IsInt()
  @Min(1)
  opensHoursBefore?: number;

  @ApiPropertyOptional({ default: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  closesHoursBefore?: number;

  @ApiPropertyOptional({ default: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  promotedConfirmHours?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}
