import { PrismaClient, type Prisma } from "@prisma/client";
import { scheduleSchema, type ScheduleInput } from "../src/domain/routines/schedule";
import { addLocalDays, atLocalTime, FALLBACK_TIME_ZONE } from "../src/lib/dates/zoned";
import { ensureUserDefaults } from "../src/server/bootstrap";

const prisma = new PrismaClient();
const zone = process.env.SEED_TIME_ZONE ?? FALLBACK_TIME_ZONE;
const email = process.env.DEV_USER_EMAIL ?? "dev@routine.local";

/** A local time `daysAgo` days before today. */
function daysAgo(days: number, time = "18:00"): Date {
  return atLocalTime(addLocalDays(new Date(), -days, zone), time, zone);
}

interface SeedRoutine {
  title: string;
  category: string;
  icon: string;
  schedule: ScheduleInput;
  priority?: "LOW" | "NORMAL" | "HIGH";
  reminder?: Prisma.InputJsonObject;
  completedDaysAgo: number[];
}

const ROUTINES: SeedRoutine[] = [
  {
    title: "Staubsaugen",
    category: "Haushalt",
    icon: "sparkles",
    schedule: { type: "INTERVAL", value: 7, unit: "DAY" },
    completedDaysAgo: [8, 15, 23],
  },
  {
    title: "Bettwäsche wechseln",
    category: "Haushalt",
    icon: "bed",
    schedule: { type: "INTERVAL", value: 14, unit: "DAY" },
    completedDaysAgo: [12, 27],
  },
  {
    title: "Gym",
    category: "Sport",
    icon: "dumbbell",
    schedule: { type: "WEEKLY_GOAL", targetCount: 3, weekStartsOn: 1 },
    completedDaysAgo: [1, 3, 7, 9, 11, 14, 16, 18],
  },
  {
    title: "Karton rausstellen",
    category: "Müll & Recycling",
    icon: "package",
    schedule: { type: "FIXED_SCHEDULE", weekdays: [1], time: "19:00" },
    priority: "HIGH",
    reminder: { offset: "AT_DUE" },
    completedDaysAgo: [7, 14],
  },
  {
    title: "Kaffeemaschine entkalken",
    category: "Wartung",
    icon: "coffee",
    schedule: { type: "INTERVAL", value: 90, unit: "DAY" },
    completedDaysAgo: [79],
  },
];

const SHOPPING_ITEMS = [
  { name: "Milch", quantity: 2, unit: "Liter", category: "Milchprodukte" },
  { name: "Brot", category: "Brot & Backwaren" },
  { name: "Waschmittel", category: "Haushalt" },
];

async function main() {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: null, timezone: null },
  });
  await ensureUserDefaults(prisma, user.id);
  await prisma.appSettings.update({ where: { userId: user.id }, data: { onboardingCompletedAt: new Date() } });

  const categories = await prisma.category.findMany({ where: { userId: user.id } });
  const categoryId = (name: string) => categories.find((c) => c.name === name)?.id ?? null;

  // Re-running the seed replaces the demo data of the development user.
  await prisma.routine.deleteMany({ where: { userId: user.id } });
  await prisma.shoppingItem.deleteMany({ where: { userId: user.id } });
  await prisma.shoppingSession.deleteMany({ where: { userId: user.id } });

  for (const seed of ROUTINES) {
    const schedule = scheduleSchema.parse(seed.schedule);
    await prisma.routine.create({
      data: {
        userId: user.id,
        title: seed.title,
        icon: seed.icon,
        categoryId: categoryId(seed.category),
        type: schedule.type,
        priority: seed.priority ?? "NORMAL",
        scheduleConfig: schedule as Prisma.InputJsonObject,
        reminderConfig: seed.reminder ?? { offset: "NONE" },
        createdAt: daysAgo(120),
        completions: {
          create: seed.completedDaysAgo.map((days) => ({
            userId: user.id,
            kind: "DONE" as const,
            completedAt: daysAgo(days),
          })),
        },
      },
    });
  }

  await prisma.shoppingItem.createMany({
    data: SHOPPING_ITEMS.map((item) => ({ userId: user.id, ...item })),
  });

  console.log(`Seeded ${ROUTINES.length} routines and ${SHOPPING_ITEMS.length} shopping items for ${email}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
