import { getDb } from '@/db';
import { matchingRuns } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole, noStore } from '@/lib/api';
import { deliverPlacementReport } from '@/lib/results-email';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, 'admin'); const { id } = await context.params; const db = getDb(); const [run] = await db.select().from(matchingRuns).where(eq(matchingRuns.id, id)).limit(1);
    if (!run || run.status !== 'locked') return noStore({ error: 'Only a locked snapshot can be resent.' }, 409);
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return noStore({ error: 'Resend is not configured.' }, 503);
    const resendId = await deliverPlacementReport(id, process.env.RESEND_API_KEY, process.env.RESEND_FROM_EMAIL);
    await db.update(matchingRuns).set({ resendId, emailStatus: 'sent' }).where(eq(matchingRuns.id, id));
    return noStore({ emailStatus: 'sent', resendId });
  } catch (error) { if (error instanceof Response) return error; return noStore({ error: error instanceof Error ? error.message : 'Email retry failed.' }, 502); }
}
