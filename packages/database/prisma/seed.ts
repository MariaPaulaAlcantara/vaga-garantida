import { PrismaClient, EventStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('senha1234', 10);

  const organizer = await prisma.user.upsert({
    where: { email: 'ana@example.com' },
    update: {},
    create: {
      name: 'Professora Ana',
      email: 'ana@example.com',
      passwordHash,
      phone: '11999990000',
      role: UserRole.ORGANIZER,
    },
  });

  const participant = await prisma.user.upsert({
    where: { email: 'joao@example.com' },
    update: {},
    create: {
      name: 'João Silva',
      email: 'joao@example.com',
      passwordHash,
      phone: '11988880000',
      role: UserRole.PARTICIPANT,
    },
  });

  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + 7);
  startsAt.setHours(8, 0, 0, 0);

  const event = await prisma.event.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {
      capacity: 6,
      policy: {
        update: {
          opensDaysBefore: 1,
          closesAtTime: '20:00',
        },
      },
    },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      organizerId: organizer.id,
      title: 'Aula de Bike - Parque Ibirapuera',
      description:
        'Aula gratuita de ciclismo para iniciantes. Traga sua bike e capacete.',
      startsAt,
      location: 'Parque Ibirapuera - Portão 7',
      capacity: 6,
      status: EventStatus.OPEN,
      policy: {
        create: {
          opensDaysBefore: 1,
          closesAtTime: '20:00',
          promotedConfirmHours: 4,
        },
      },
    },
  });

  console.log('Seed concluído:', {
    organizer: organizer.email,
    participant: participant.email,
    event: event.title,
    defaultPassword: 'senha1234',
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
