import { getDb } from '@/db';
import { auditEvents, candidates, leadRankings, matchingRuns, placements, projects } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireRole, noStore } from '@/lib/api';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(request, 'admin'); const { id } = await context.params;
    const { netid, projectId, confirmUnacceptable } = await request.json() as { netid?: string; projectId?: string; confirmUnacceptable?: boolean };
    if (!netid || !projectId) return noStore({ error: 'Candidate and project are required.' }, 400);
    const db = getDb(); const [run] = await db.select().from(matchingRuns).where(eq(matchingRuns.id, id)).limit(1);
    if (!run || run.status !== 'provisional') return noStore({ error: 'Only a provisional run can be adjusted.' }, 409);
    const [[candidate], [project], [existing], assigned] = await Promise.all([
      db.select().from(candidates).where(and(eq(candidates.netid, netid), eq(candidates.active, true))).limit(1),
      db.select().from(projects).where(eq(projects.id, projectId)).limit(1),
      db.select().from(placements).where(and(eq(placements.runId, id), eq(placements.netid, netid))).limit(1),
      db.select().from(placements).where(eq(placements.runId, id)),
    ]);
    if (!candidate || !project || existing) return noStore({ error: 'Candidate is unavailable or already assigned.' }, 409);
    if (assigned.filter((placement) => placement.projectId === projectId).length >= project.capacity) return noStore({ error: 'That project has no open capacity.' }, 409);
    const [ranking] = await db.select().from(leadRankings).where(and(eq(leadRankings.projectId, projectId), eq(leadRankings.netid, netid))).limit(1);
    const overrodeUnacceptable = !ranking?.acceptable;
    if (overrodeUnacceptable && !confirmUnacceptable) return noStore({ error: 'Explicit confirmation is required to override an unacceptable decision.', requiresConfirmation: true }, 409);
    const now = new Date();
    await db.insert(placements).values({ runId: id, netid, projectId, source: 'admin_override', overriddenUnacceptable: overrodeUnacceptable, createdAt: now });
    await db.insert(auditEvents).values({ id: crypto.randomUUID(), actor: session.subject, action: 'admin_override_assignment', entityType: 'placement', entityId: `${id}:${netid}`, detailJson: JSON.stringify({ projectId, overrodeUnacceptable }), createdAt: now });
    return noStore({ ok: true, overrodeUnacceptable });
  } catch (error) { if (error instanceof Response) return error; return noStore({ error: 'Assignment could not be recorded.' }, 500); }
}
