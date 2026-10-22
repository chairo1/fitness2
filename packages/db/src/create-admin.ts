import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { parseArgs } from 'node:util';

export async function createAdmin(prisma: PrismaClient, rawEmail: string, password: string) {
  const email = rawEmail.trim().toLowerCase();
  if (!email || !password) throw new Error('email and password are required');
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return prisma.user.update({ where: { email }, data: { role: 'admin', status: 'active' } });
  }
  const passwordHash = await argon2.hash(password);
  return prisma.user.create({ data: { email, passwordHash, role: 'admin' } });
}

/** Parses CLI args; tolerates the literal leading "--" that pnpm forwards. */
export function parseCliArgs(argv: string[]) {
  const args = argv[0] === '--' ? argv.slice(1) : argv;
  const { values } = parseArgs({
    args,
    options: { email: { type: 'string' }, password: { type: 'string' } },
  });
  return values;
}

if (require.main === module) {
  const values = parseCliArgs(process.argv.slice(2));
  if (!values.email || !values.password) {
    console.error('Usage: create-admin --email <email> --password <password>');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  createAdmin(prisma, values.email, values.password)
    .then((u) => console.log(`Admin ready: ${u.email}`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
