import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  NOTIFICATION_PROVIDER,
  NotificationProvider,
} from '../notifications/notification.interface';
import { UsersService } from '../users/users.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
    @Inject(NOTIFICATION_PROVIDER)
    private readonly notifications: NotificationProvider,
  ) {}

  async requestOtp(dto: RequestOtpDto) {
    const phone = this.normalizePhone(dto.phone);
    const twilioConfigured = Boolean(
      this.config.get<string>('TWILIO_ACCOUNT_SID') &&
        this.config.get<string>('TWILIO_AUTH_TOKEN') &&
        this.config.get<string>('TWILIO_PHONE_NUMBER'),
    );

    const code =
      twilioConfigured || this.config.get<string>('NODE_ENV') === 'production'
        ? this.generateOtp()
        : this.config.get<string>('OTP_MOCK_CODE', '123456');

    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.otpSession.deleteMany({ where: { phone } });
    await this.prisma.otpSession.create({
      data: { phone, codeHash, expiresAt },
    });

    await this.notifications.sendOtp(phone, code);

    return { message: 'Código enviado com sucesso' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const phone = this.normalizePhone(dto.phone);
    const session = await this.prisma.otpSession.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      throw new UnauthorizedException('Código inválido ou expirado');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Código expirado');
    }

    if (session.attempts >= MAX_OTP_ATTEMPTS) {
      throw new UnauthorizedException('Limite de tentativas excedido');
    }

    const valid = await bcrypt.compare(dto.code, session.codeHash);
    if (!valid) {
      await this.prisma.otpSession.update({
        where: { id: session.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Código inválido');
    }

    await this.prisma.otpSession.delete({ where: { id: session.id } });

    let user = await this.usersService.findByPhone(phone);
    if (!user) {
      if (!dto.name?.trim()) {
        throw new BadRequestException(
          'Nome é obrigatório para novo cadastro',
        );
      }
      user = await this.usersService.create({ name: dto.name.trim(), phone });
    }

    const token = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      role: user.role,
    });

    return {
      accessToken: token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
