import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: '11999998888' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10,13}$/, { message: 'Telefone inválido' })
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Código deve ter 6 dígitos' })
  code!: string;

  @ApiPropertyOptional({ example: 'Maria Souza' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ enum: ['participant', 'organizer'], default: 'participant' })
  @IsOptional()
  @IsIn(['participant', 'organizer'])
  registerAs?: 'participant' | 'organizer';
}
