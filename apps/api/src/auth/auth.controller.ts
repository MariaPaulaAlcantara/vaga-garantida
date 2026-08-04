import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@vaga-garantida/database';
import { AuthService } from './auth.service';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Cadastro com email e senha' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login de participante (aluno)' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto, UserRole.PARTICIPANT);
  }

  @Post('login/organizer')
  @ApiOperation({ summary: 'Login de organizador (professor)' })
  loginOrganizer(@Body() dto: LoginDto) {
    return this.authService.login(dto, UserRole.ORGANIZER);
  }

  @Post('password-reset/request')
  @ApiOperation({ summary: 'Solicitar código de redefinição de senha (aluno)' })
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('password-reset/confirm')
  @ApiOperation({ summary: 'Confirmar código e redefinir senha (aluno)' })
  confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    return this.authService.confirmPasswordReset(dto);
  }

  @Post('otp/request')
  @ApiOperation({ deprecated: true, summary: 'Deprecated: use /auth/register' })
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto);
  }

  @Post('otp/verify')
  @ApiOperation({ deprecated: true, summary: 'Deprecated: use /auth/login' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }
}
