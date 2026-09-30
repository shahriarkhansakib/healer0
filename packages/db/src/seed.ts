import { db } from './index';
import { users, accounts } from './schema/auth';
import { eq } from 'drizzle-orm';
import { scrypt } from 'crypto';

function generateKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      64,
      {
        N: 16384,
        r: 16,
        p: 1,
        maxmem: 128 * 16384 * 16 * 2,
      },
      (err, buff) => {
        if (err) return reject(err);
        resolve(buff);
      }
    );
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex');
  const key = await generateKey(password, salt);
  return `${salt}:${key.toString('hex')}`;
}

async function main() {
  const superAdminPassword = await hashPassword('password123');
  const adminPassword = await hashPassword('password123');

  // Seed super_admin
  const existingSuperAdmin = await db.query.users.findFirst({ where: eq(users.email, 'superadmin@healer.app') });
  if (!existingSuperAdmin) {
    const [user] = await db.insert(users).values({
      name: 'Super Admin',
      email: 'superadmin@healer.app',
      emailVerified: true,
      role: 'super_admin',
      status: 'active',
    }).returning();
    
    if (user) {
      await db.insert(accounts).values({
        userId: user.id,
        accountId: 'superadmin@healer.app',
        providerId: 'credential',
        password: superAdminPassword,
      });
    }
  } else {
    // Update password for existing superadmin
    await db.update(accounts)
      .set({ password: superAdminPassword })
      .where(eq(accounts.accountId, 'superadmin@healer.app'));
  }

  // Seed admin
  const existingAdmin = await db.query.users.findFirst({ where: eq(users.email, 'admin@healer.app') });
  if (!existingAdmin) {
    const [user] = await db.insert(users).values({
      name: 'Admin',
      email: 'admin@healer.app',
      emailVerified: true,
      role: 'admin',
      status: 'active',
    }).returning();
    
    if (user) {
      await db.insert(accounts).values({
        userId: user.id,
        accountId: 'admin@healer.app',
        providerId: 'credential',
        password: adminPassword,
      });
    }
  } else {
    // Update password for existing admin
    await db.update(accounts)
      .set({ password: adminPassword })
      .where(eq(accounts.accountId, 'admin@healer.app'));
  }

  console.log('Seeding completed successfully.');
}

main().catch(console.error).finally(() => process.exit(0));
