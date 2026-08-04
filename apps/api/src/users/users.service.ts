import { Injectable, NotFoundException } from '@nestjs/common';
import { RegistrationStatus, User, UserRole } from '@vaga-garantida/database';
import { PrismaService } from '../prisma/prisma.service';

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByPhone(phone: string) {
    const normalized = this.normalizePhone(phone);
    return this.prisma.user.findUnique({ where: { phone: normalized } });
  }

  findByEmail(email: string) {
    const normalized = this.normalizeEmail(email);
    return this.prisma.user.findUnique({ where: { email: normalized } });
  }

  create(data: {
    name: string;
    email: string;
    phone: string;
    passwordHash: string;
    role?: UserRole;
  }) {
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: this.normalizeEmail(data.email),
        phone: this.normalizePhone(data.phone),
        passwordHash: data.passwordHash,
        role: data.role ?? UserRole.PARTICIPANT,
      },
    });
  }

  async updateProfile(userId: string, name: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name },
    });
    return this.toPublicUser(user);
  }

  async updatePasswordHash(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async getParticipationHistory(userId: string) {
    const registrations = await this.prisma.eventRegistration.findMany({
      where: {
        userId,
        status: {
          in: [
            RegistrationStatus.ATTENDED,
            RegistrationStatus.NO_SHOW,
            RegistrationStatus.CANCELLED,
            RegistrationStatus.EXPIRED,
            RegistrationStatus.CONFIRMED,
            RegistrationStatus.RESERVED,
            RegistrationStatus.WAITLIST,
          ],
        },
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            location: true,
            status: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return registrations;
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return this.toPublicUser(user);
  }
}
