import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { User, UserRole } from '@vaga-garantida/database';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  NOTIFICATION_PROVIDER,
  NotificationProvider,
} from '../notifications/notification.interface';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
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

  async register(dto: RegisterDto) {
    const email = this.usersService.normalizeEmail(dto.email);
    const phone = this.usersService.normalizePhone(dto.phone);
    const registerAs = dto.registerAs ?? 'participant';

    const existingByEmail = await this.usersService.findByEmail(email);
    if (existingByEmail) {
      throw new ConflictException('Este email já está cadastrado');
    }

    const existingByPhone = await this.usersService.findByPhone(phone);
    if (existingByPhone) {
      if (
        registerAs === 'organizer' &&
        existingByPhone.role === UserRole.PARTICIPANT
      ) {
        throw new ConflictException(
          'Este telefone já está cadastrado como aluno',
        );
      }
      throw new ConflictException('Este telefone já está cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      name: dto.name.trim(),
      email,
      phone,
      passwordHash,
      role:
        registerAs === 'organizer' ? UserRole.ORGANIZER : UserRole.PARTICIPANT,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto, expectedRole?: UserRole) {
    const email = this.usersService.normalizeEmail(dto.email);
    const user = await this.usersService.findByEmail(email);

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    if (expectedRole && user.role !== expectedRole) {
      throw new ForbiddenException(
        expectedRole === UserRole.ORGANIZER
          ? 'Esta conta não é de organizador. Use o login de aluno.'
          : 'Esta conta é de organizador. Use o login de professor.',
      );
    }

    return this.buildAuthResponse(user);
  }

  /** @deprecated Use register/login com email e senha */
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

  /** @deprecated Use register/login com email e senha */
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

    const registerAs = dto.registerAs ?? 'participant';
    const user = await this.usersService.findByPhone(phone);

    if (!user) {
      throw new BadRequestException(
        'Cadastre-se com email e senha antes de entrar',
      );
    }

    if (registerAs === 'organizer' && user.role === UserRole.PARTICIPANT) {
      throw new ConflictException(
        'Este telefone já está cadastrado como aluno',
      );
    }

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: User) {
    return {
      accessToken: this.signToken(user),
      user: this.usersService.toPublicUser(user),
    };
  }

  private signToken(user: User) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
