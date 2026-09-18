import { getDb } from '@/db';
import { candidates, matchingRuns, placements, projects } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireRole, noStore } from '@/lib/api';
import { deliverPlacementReport } from '@/lib/results-email';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, 'admin'); const { id } = await context.params; const db = getDb();
    const [[run], active, assigned, projectRows] = await Promise.all([db.select().from(matchingRuns).where(eq(matchingRuns.id, id)).limit(1), db.select({ netid: candidates.netid }).from(candidates).where(eq(candidates.active, true)), db.select().from(placements).where(eq(placements.runId, id)), db.select().from(projects)]);
    if (!run || run.status !== 'provisional') return noStore({ error: 'Only a provisional run can be locked.' }, 409);
    if (assigned.length !== active.length || new Set(assigned.map((placement) => placement.netid)).size !== active.length || projectRows.some((project) => assigned.filter((placement) => placement.projectId === project.id).length !== project.capacity)) return noStore({ error: 'Assign every active candidate and fill every project capacity before locking.' }, 409);
    await db.update(matchingRuns).set({ status: 'locked', lockedAt: new Date(), emailStatus: 'sending' }).where(and(eq(matchingRuns.id, id), eq(matchingRuns.status, 'provisional')));
    try {
      if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
        await db.update(matchingRuns).set({ emailStatus: 'not_sent' }).where(eq(matchingRuns.id, id));
        return noStore({ locked: true, emailStatus: 'not_sent' });
      }
      const resendId = await deliverPlacementReport(id, process.env.RESEND_API_KEY, process.env.RESEND_FROM_EMAIL);
      await db.update(matchingRuns).set({ resendId, emailStatus: 'sent' }).where(eq(matchingRuns.id, id));
      return noStore({ locked: true, emailStatus: 'sent', resendId });
    } catch (error) { await db.update(matchingRuns).set({ emailStatus: 'failed' }).where(eq(matchingRuns.id, id)); return noStore({ locked: true, emailStatus: 'failed', deliveryError: error instanceof Error ? error.message : 'Email delivery failed.' }); }
  } catch (error) { if (error instanceof Response) return error; return noStore({ error: 'Results could not be locked.' }, 500); }
}
