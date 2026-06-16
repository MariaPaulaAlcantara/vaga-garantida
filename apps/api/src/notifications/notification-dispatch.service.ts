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
import {
  buildEventUrl,
  emailLayout,
  escapeHtml,
  formatEventDate,
  resolveWebAppUrl,
} from './email-format.util';

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
    this.appUrl = resolveWebAppUrl(this.config);
    this.logger.log(`Links de email apontam para: ${this.appUrl}`);
  }

  async notifyPromoted(params: {
    user: Pick<User, 'email' | 'name'>;
    event: Pick<Event, 'id' | 'title' | 'startsAt' | 'location'>;
    confirmationDeadline: Date | null;
  }) {
    const eventLink = buildEventUrl(this.appUrl, params.event.id);
    const deadlineText = params.confirmationDeadline
      ? formatEventDate(params.confirmationDeadline)
      : 'o prazo indicado no app';

    const body = `
      <p style="margin: 0 0 16px;">Olá, <strong>${escapeHtml(params.user.name)}</strong>!</p>
      <p style="margin: 0 0 16px;">Uma vaga foi liberada e você saiu da lista de espera.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin: 0 0 16px; background-color: #F3EEFF; border: 1px solid #D4B8FF; border-radius: 12px;">
        <tr>
          <td style="padding: 16px;">
            <p style="margin: 0 0 6px; font-size: 16px; font-weight: 700; color: #111827;">${escapeHtml(params.event.title)}</p>
            <p style="margin: 0; font-size: 14px; color: #6B7280;">${formatEventDate(params.event.startsAt)} — ${escapeHtml(params.event.location)}</p>
          </td>
        </tr>
      </table>
      <p style="margin: 0;">Confirme sua presença até <strong>${deadlineText}</strong> para garantir a vaga.</p>
    `;

    await this.sendSafe(
      params.user.email,
      `Vaga liberada: ${params.event.title}`,
      emailLayout('Sua vaga foi liberada!', body, this.appUrl, {
        href: eventLink,
        label: 'Confirmar presença',
      }),
    );
  }

  async notifyWaitlistPosition(params: {
    registrationId: string;
    user: Pick<User, 'email' | 'name'>;
    event: Pick<Event, 'id' | 'title' | 'startsAt'>;
    position: number;
    previousPosition?: number;
  }) {
    const eventLink = buildEventUrl(this.appUrl, params.event.id);
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
      <p style="margin: 0 0 16px;">Olá, <strong>${escapeHtml(params.user.name)}</strong>!</p>
      <p style="margin: 0 0 16px;">${intro}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin: 0 0 16px; background-color: #F3EEFF; border: 1px solid #D4B8FF; border-radius: 12px;">
        <tr>
          <td style="padding: 16px;">
            <p style="margin: 0 0 6px; font-size: 16px; font-weight: 700; color: #111827;">${escapeHtml(params.event.title)}</p>
            <p style="margin: 0; font-size: 14px; color: #6B7280;">${formatEventDate(params.event.startsAt)}</p>
          </td>
        </tr>
      </table>
      <p style="margin: 0;">Se uma vaga for liberada, você será avisado por e-mail.</p>
    `;

    const sent = await this.sendSafe(
      params.user.email,
      subject,
      emailLayout('Atualização na lista de espera', body, this.appUrl, {
        href: eventLink,
        label: 'Ver aula',
      }),
    );

    if (sent) {
      await this.prisma.eventRegistration.update({
        where: { id: params.registrationId },
        data: { lastNotifiedWaitlistPosition: params.position },
      });
    }
  }

  async notifyConfirmationReminder(params: {
    registrationId: string;
    user: Pick<User, 'email' | 'name'>;
    event: Pick<Event, 'id' | 'title' | 'startsAt' | 'location'>;
    deadline: Date;
  }) {
    const eventLink = buildEventUrl(this.appUrl, params.event.id);

    const body = `
      <p style="margin: 0 0 16px;">Olá, <strong>${escapeHtml(params.user.name)}</strong>!</p>
      <p style="margin: 0 0 16px;">Chegou o momento de confirmar se você vai participar.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin: 0 0 16px; background-color: #F3EEFF; border: 1px solid #D4B8FF; border-radius: 12px;">
        <tr>
          <td style="padding: 16px;">
            <p style="margin: 0 0 6px; font-size: 16px; font-weight: 700; color: #111827;">${escapeHtml(params.event.title)}</p>
            <p style="margin: 0; font-size: 14px; color: #6B7280;">${formatEventDate(params.event.startsAt)} — ${escapeHtml(params.event.location)}</p>
          </td>
        </tr>
      </table>
      <p style="margin: 0;">Confirme até <strong>${formatEventDate(params.deadline)}</strong> para manter sua vaga.</p>
    `;

    const sent = await this.sendSafe(
      params.user.email,
      `Confirme sua presença: ${params.event.title}`,
      emailLayout('Hora de confirmar sua presença', body, this.appUrl, {
        href: eventLink,
        label: 'Confirmar presença',
      }),
    );

    if (sent) {
      await this.prisma.eventRegistration.update({
        where: { id: params.registrationId },
        data: { confirmationReminderSentAt: new Date() },
      });
    }
  }

  async notifyNewEvent(params: {
    event: Pick<Event, 'id' | 'title' | 'startsAt' | 'location' | 'description'>;
    organizerName: string;
    participants: Pick<User, 'id' | 'email' | 'name'>[];
  }) {
    const eventLink = buildEventUrl(this.appUrl, params.event.id);

    const body = `
      <p style="margin: 0 0 16px;"><strong>${escapeHtml(params.organizerName)}</strong> criou uma nova aula.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin: 0 0 16px; background-color: #F3EEFF; border: 1px solid #D4B8FF; border-radius: 12px;">
        <tr>
          <td style="padding: 16px;">
            <p style="margin: 0 0 6px; font-size: 16px; font-weight: 700; color: #111827;">${escapeHtml(params.event.title)}</p>
            <p style="margin: 0 0 8px; font-size: 14px; color: #6B7280;">${formatEventDate(params.event.startsAt)} — ${escapeHtml(params.event.location)}</p>
            <p style="margin: 0; font-size: 14px; color: #111827;">${escapeHtml(params.event.description)}</p>
          </td>
        </tr>
      </table>
    `;

    let sent = 0;
    let failed = 0;

    for (const participant of params.participants) {
      const personalizedBody = `
        <p style="margin: 0 0 16px;">Olá, <strong>${escapeHtml(participant.name)}</strong>!</p>
        ${body}
      `;

      const ok = await this.sendSafe(
        participant.email,
        `Nova aula: ${params.event.title}`,
        emailLayout('Nova aula disponível', personalizedBody, this.appUrl, {
          href: eventLink,
          label: 'Reservar vaga',
        }),
      );
      if (ok) {
        sent++;
      } else {
        failed++;
      }
    }

    if (failed > 0) {
      this.logger.warn(
        `Nova aula "${params.event.title}": ${sent} enviados, ${failed} falharam`,
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

  async findParticipantsForNewEvent(organizerId: string, excludeEventId: string) {
    const now = new Date();

    return this.prisma.user.findMany({
      where: {
        role: UserRole.PARTICIPANT,
        NOT: { id: organizerId },
        registrations: {
          some: {
            status: {
              in: [
                RegistrationStatus.ATTENDED,
                RegistrationStatus.NO_SHOW,
                RegistrationStatus.CONFIRMED,
              ],
            },
            event: {
              organizerId,
              id: { not: excludeEventId },
              startsAt: { lt: now },
            },
          },
        },
      },
      select: { id: true, email: true, name: true },
    });
  }

  private async sendSafe(
    to: string,
    subject: string,
    html: string,
  ): Promise<boolean> {
    try {
      await this.email.sendEmail(to, subject, html);
      return true;
    } catch (err) {
      this.logger.error(`Falha ao enviar email para ${to}: ${subject}`, err);
      return false;
    }
  }
}
