import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({ example: '11999998888' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10,13}$/, { message: 'Telefone inválido' })
  phone!: string;
}
