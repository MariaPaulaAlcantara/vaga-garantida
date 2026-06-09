import { PrismaClient, EventStatus, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const organizer = await prisma.user.upsert({
    where: { phone: '11999990000' },
    update: {},
    create: {
      name: 'Professora Ana',
      phone: '11999990000',
      role: UserRole.ORGANIZER,
    },
  });

  const participant = await prisma.user.upsert({
    where: { phone: '11988880000' },
    update: {},
    create: {
      name: 'João Silva',
      phone: '11988880000',
      role: UserRole.PARTICIPANT,
    },
  });

  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + 7);
  startsAt.setHours(8, 0, 0, 0);

  const event = await prisma.event.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      organizerId: organizer.id,
      title: 'Aula de Bike - Parque Ibirapuera',
      description:
        'Aula gratuita de ciclismo para iniciantes. Traga sua bike e capacete.',
      startsAt,
      location: 'Parque Ibirapuera - Portão 7',
      capacity: 10,
      status: EventStatus.OPEN,
      policy: {
        create: {
          opensHoursBefore: 48,
          closesHoursBefore: 12,
          promotedConfirmHours: 4,
        },
      },
    },
  });

  console.log('Seed concluído:', { organizer: organizer.phone, participant: participant.phone, event: event.title });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
