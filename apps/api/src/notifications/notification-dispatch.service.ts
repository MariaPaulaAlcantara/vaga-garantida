import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Event,
  RegistrationStatus,
  User,
  UserRole,
} from '@vaga-garantida/database';
import { PrismaService } from '../prisma/prisma.service';
import { getConfirmationWindow } from '../registrations/confirmation-window.util';
import {
  EMAIL_NOTIFICATION_PROVIDER,
  EmailNotificationProvider,
} from './email-notification.interface';
import { emailLayout, formatEventDate } from './email-format.util';

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(EMAIL_NOTIFICATION_PROVIDER)
    private readonly email: EmailNotificationProvider,
  ) {
    this.appUrl =
      this.config.get<string>('APP_URL') ??
      this.config.get<string>('CORS_ORIGIN') ??
      'http://localhost:3000';
  }

  async notifyPromoted(params: {
    user: Pick<User, 'email' | 'name'>;
    event: Pick<Event, 'id' | 'title' | 'startsAt' | 'location'>;
    confirmationDeadline: Date | null;
  }) {
    const deadlineText = params.confirmationDeadline
      ? formatEventDate(params.confirmationDeadline)
      : 'o prazo indicado no app';

    const body = `
      <p>Olá, ${params.user.name}!</p>
      <p>Uma vaga foi liberada e você saiu da lista de espera.</p>
      <p><strong>${params.event.title}</strong><br>
      ${formatEventDate(params.event.startsAt)} — ${params.event.location}</p>
      <p>Confirme sua presença até <strong>${deadlineText}</strong> para garantir a vaga.</p>
      <p><a href="${this.eventUrl(params.event.id)}" style="color: #059669;">Confirmar presença</a></p>
    `;

    await this.sendSafe(
      params.user.email,
      `Vaga liberada: ${params.event.title}`,
      emailLayout('Sua vaga foi liberada!', body, this.appUrl),
    );
  }

  async notifyWaitlistPosition(params: {
    registrationId: string;
    user: Pick<User, 'email' | 'name'>;
    event: Pick<Event, 'id' | 'title' | 'startsAt'>;
    position: number;
    previousPosition?: number;
  }) {
    const advanced =
      params.previousPosition !== undefined &&
      params.position < params.previousPosition;

    const subject = advanced
      ? `Lista de espera: você avançou para a posição ${params.position}`
      : `Lista de espera: posição ${params.position}`;

    const intro = advanced
      ? `Você avançou na lista de espera e agora está na <strong>posição ${params.position}</strong>.`
      : `Você entrou na lista de espera na <strong>posição ${params.position}</strong>.`;

    const body = `
      <p>Olá, ${params.user.name}!</p>
      <p>${intro}</p>
      <p><strong>${params.event.title}</strong><br>
      ${formatEventDate(params.event.startsAt)}</p>
      <p>Se uma vaga for liberada, você será avisado por email.</p>
      <p><a href="${this.eventUrl(params.event.id)}" style="color: #059669;">Ver evento</a></p>
    `;

    await this.sendSafe(
      params.user.email,
      subject,
      emailLayout('Atualização na lista de espera', body, this.appUrl),
    );

    await this.prisma.eventRegistration.update({
      where: { id: params.registrationId },
      data: { lastNotifiedWaitlistPosition: params.position },
    });
  }

  async notifyConfirmationReminder(params: {
    registrationId: string;
    user: Pick<User, 'email' | 'name'>;
    event: Pick<Event, 'id' | 'title' | 'startsAt' | 'location'>;
    deadline: Date;
  }) {
    const body = `
      <p>Olá, ${params.user.name}!</p>
      <p>Chegou o momento de confirmar se você vai participar.</p>
      <p><strong>${params.event.title}</strong><br>
      ${formatEventDate(params.event.startsAt)} — ${params.event.location}</p>
      <p>Confirme até <strong>${formatEventDate(params.deadline)}</strong> para manter sua vaga.</p>
      <p><a href="${this.eventUrl(params.event.id)}" style="color: #059669;">Confirmar presença</a></p>
    `;

    await this.sendSafe(
      params.user.email,
      `Confirme sua presença: ${params.event.title}`,
      emailLayout('Hora de confirmar sua presença', body, this.appUrl),
    );

    await this.prisma.eventRegistration.update({
      where: { id: params.registrationId },
      data: { confirmationReminderSentAt: new Date() },
    });
  }

  async notifyNewEvent(params: {
    event: Pick<Event, 'id' | 'title' | 'startsAt' | 'location' | 'description'>;
    organizerName: string;
    participants: Pick<User, 'id' | 'email' | 'name'>[];
  }) {
    const body = `
      <p><strong>${params.organizerName}</strong> criou uma nova aula.</p>
      <p><strong>${params.event.title}</strong><br>
      ${formatEventDate(params.event.startsAt)} — ${params.event.location}</p>
      <p>${params.event.description}</p>
      <p><a href="${this.eventUrl(params.event.id)}" style="color: #059669;">Reservar vaga</a></p>
    `;

    for (const participant of params.participants) {
      await this.sendSafe(
        participant.email,
        `Nova aula: ${params.event.title}`,
        emailLayout('Nova aula disponível', body, this.appUrl),
      );
    }
  }

  async processConfirmationReminders() {
    const now = new Date();
    const registrations = await this.prisma.eventRegistration.findMany({
      where: {
        status: RegistrationStatus.RESERVED,
        confirmationReminderSentAt: null,
      },
      include: {
        user: { select: { email: true, name: true } },
        event: {
          include: { policy: true },
        },
      },
    });

    let sent = 0;

    for (const registration of registrations) {
      if (!registration.event.policy) {
        continue;
      }

      const window = getConfirmationWindow(
        registration.event.startsAt,
        registration.event.policy,
        now,
      );

      if (now < window.opensAt) {
        continue;
      }

      const deadline =
        registration.confirmationDeadline ?? window.closesAt;

      try {
        await this.notifyConfirmationReminder({
          registrationId: registration.id,
          user: registration.user,
          event: registration.event,
          deadline,
        });
        sent++;
      } catch (err) {
        this.logger.error(
          `Falha ao enviar lembrete de confirmação (${registration.id})`,
          err,
        );
      }
    }

    return { sent };
  }

  async handleWaitlistPositionChanges(
    eventId: string,
    changes: Array<{
      registrationId: string;
      userId: string;
      newPosition: number;
      previousPosition: number;
    }>,
  ) {
    if (changes.length === 0) {
      return;
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, startsAt: true },
    });

    if (!event) {
      return;
    }

    for (const change of changes) {
      const user = await this.prisma.user.findUnique({
        where: { id: change.userId },
        select: { email: true, name: true },
      });

      if (!user) {
        continue;
      }

      try {
        await this.notifyWaitlistPosition({
          registrationId: change.registrationId,
          user,
          event,
          position: change.newPosition,
          previousPosition: change.previousPosition,
        });
      } catch (err) {
        this.logger.error(
          `Falha ao avisar posição na fila (${change.registrationId})`,
          err,
        );
      }
    }
  }

  async findParticipantsForNewEvent(organizerId: string) {
    return this.prisma.user.findMany({
      where: {
        role: UserRole.PARTICIPANT,
        NOT: { id: organizerId },
      },
      select: { id: true, email: true, name: true },
    });
  }

  private eventUrl(eventId: string) {
    return `${this.appUrl}/eventos/${eventId}`;
  }

  private async sendSafe(to: string, subject: string, html: string) {
    try {
      await this.email.sendEmail(to, subject, html);
    } catch (err) {
      this.logger.error(`Falha ao enviar email para ${to}: ${subject}`, err);
      throw err;
    }
  }
}
