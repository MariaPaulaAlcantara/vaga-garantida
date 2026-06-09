import { Injectable, NotFoundException } from '@nestjs/common';
import { RegistrationStatus, UserRole } from '@vaga-garantida/database';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByPhone(phone: string) {
    const normalized = phone.replace(/\D/g, '');
    return this.prisma.user.findUnique({ where: { phone: normalized } });
  }

  create(data: { name: string; phone: string; role?: UserRole }) {
    const phone = data.phone.replace(/\D/g, '');
    return this.prisma.user.create({
      data: {
        name: data.name,
        phone,
        role: data.role ?? UserRole.PARTICIPANT,
      },
    });
  }

  async updateProfile(userId: string, name: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { name },
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
    return user;
  }
}
