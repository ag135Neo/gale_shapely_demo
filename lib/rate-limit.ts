import { getDb } from '@/db';
import { authRateLimits } from '@/db/schema';
import { eq } from 'drizzle-orm';

const windowMs = 15 * 60 * 1000;
const maxAttempts = 10;

export function loginKey(request: Request, scope: string) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  return `${scope}:${forwarded}`.slice(0, 220);
}

export async function allowLogin(key: string) {
  const [row] = await getDb().select().from(authRateLimits).where(eq(authRateLimits.key, key)).limit(1);
  return !row || Date.now() - row.windowStartedAt.getTime() >= windowMs || row.attempts < maxAttempts;
}

export async function recordFailure(key: string) {
  const db = getDb(); const now = new Date(); const [row] = await db.select().from(authRateLimits).where(eq(authRateLimits.key, key)).limit(1);
  if (!row || Date.now() - row.windowStartedAt.getTime() >= windowMs) await db.insert(authRateLimits).values({ key, attempts: 1, windowStartedAt: now }).onConflictDoUpdate({ target: authRateLimits.key, set: { attempts: 1, windowStartedAt: now } });
  else await db.update(authRateLimits).set({ attempts: row.attempts + 1 }).where(eq(authRateLimits.key, key));
}

export async function clearFailures(key: string) { await getDb().delete(authRateLimits).where(eq(authRateLimits.key, key)); }
