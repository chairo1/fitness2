import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seed } from '../prisma/seed';

const prisma = new PrismaClient();
const email = 'seed-test-user@example.test';

describe('seed', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it('is idempotent and never touches users', async () => {
    await seed(prisma);
    await prisma.user.create({ data: { email, passwordHash: 'x' } });
    await seed(prisma);

    expect(await prisma.muscleGroup.count()).toBe(10);
    expect(await prisma.equipment.count()).toBe(5);
    expect(await prisma.exercise.count({ where: { isCustomSeed: true } })).toBe(17);
    expect((await prisma.exercise.findUnique({ where: { slug: 'plank' } }))?.measureType).toBe(
      'time',
    );
    expect(
      (await prisma.exercise.findUnique({ where: { slug: 'dumbbell-squat' } }))?.measureType,
    ).toBe('reps_weight');
    expect(await prisma.user.findUnique({ where: { email } })).not.toBeNull();
  });
});
