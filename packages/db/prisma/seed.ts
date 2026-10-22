import { PrismaClient } from '@prisma/client';
import { equipment, exercises, muscleGroups } from '../src/seed-data';

/** Idempotent: upserts by slug only, never deletes, never overwrites admin-editable fields. */
export async function seed(prisma: PrismaClient = new PrismaClient()): Promise<void> {
  for (const m of muscleGroups) {
    await prisma.muscleGroup.upsert({
      where: { slug: m.slug },
      update: { mapId: m.mapId },
      create: m,
    });
  }
  for (const e of equipment) {
    await prisma.equipment.upsert({
      where: { slug: e.slug },
      update: {},
      create: e,
    });
  }
  const muscleIds = new Map((await prisma.muscleGroup.findMany()).map((m) => [m.slug, m.id]));
  const equipmentIds = new Map((await prisma.equipment.findMany()).map((e) => [e.slug, e.id]));
  const idOf = (map: Map<string, string>, slug: string) => {
    const id = map.get(slug);
    if (!id) throw new Error(`Unknown seed reference: ${slug}`);
    return id;
  };

  for (const ex of exercises) {
    const structural = {
      measureType: ex.measureType,
      equipmentId: idOf(equipmentIds, ex.equipment),
      isCustomSeed: true,
    };
    // Names/descriptions/image are admin-editable: only set on create, never overwritten.
    const row = await prisma.exercise.upsert({
      where: { slug: ex.slug },
      update: structural,
      create: { slug: ex.slug, nameAz: ex.nameAz, nameEn: ex.nameEn, ...structural },
    });
    const links = [
      ...ex.primary.map((s) => ({ slug: s, primary: true })),
      ...ex.secondary.map((s) => ({ slug: s, primary: false })),
    ];
    for (const l of links) {
      const muscleGroupId = idOf(muscleIds, l.slug);
      await prisma.exerciseMuscle.upsert({
        where: { exerciseId_muscleGroupId: { exerciseId: row.id, muscleGroupId } },
        update: {},
        create: { exerciseId: row.id, muscleGroupId, primary: l.primary },
      });
    }
  }
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seed(prisma)
    .then(() => console.log('Seed complete'))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
