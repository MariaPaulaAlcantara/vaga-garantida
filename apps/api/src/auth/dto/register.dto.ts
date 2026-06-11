import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Maria Souza' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'maria@email.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'senha1234' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: '11999998888' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10,13}$/, { message: 'Telefone inválido' })
  phone!: string;

  @ApiPropertyOptional({
    enum: ['participant', 'organizer'],
    default: 'participant',
  })
  @IsOptional()
  @IsIn(['participant', 'organizer'])
  registerAs?: 'participant' | 'organizer';
}
