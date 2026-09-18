import { assertSameOrigin, expiredCookie, readSession } from '@/lib/auth';
import { getDb } from '@/db';
import { sessions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try { assertSameOrigin(request); const session = await readSession(request); if (session) await getDb().update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, session.id)); return Response.json({ ok: true }, { headers: { 'set-cookie': expiredCookie() } }); }
  catch { return Response.json({ error: 'Invalid request origin.' }, { status: 403 }); }
}
