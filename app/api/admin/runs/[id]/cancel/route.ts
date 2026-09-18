import { getDb } from '@/db';
import { matchingRuns } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireRole, noStore } from '@/lib/api';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, 'admin'); const { id } = await context.params;
    const result = await getDb().update(matchingRuns).set({ status: 'cancelled' }).where(and(eq(matchingRuns.id, id), eq(matchingRuns.status, 'provisional'))).returning({ id: matchingRuns.id });
    return result.length ? noStore({ ok: true }) : noStore({ error: 'The provisional run cannot be cancelled.' }, 409);
  } catch (error) { if (error instanceof Response) return error; return noStore({ error: 'Run cancellation failed.' }, 500); }
}
