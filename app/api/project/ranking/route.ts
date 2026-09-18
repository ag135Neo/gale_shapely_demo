import { getDb } from '@/db';
import { auditEvents, candidates, leadRankings, matchingRuns, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole, noStore } from '@/lib/api';
import { projectIdForLead } from '@/lib/projects';

export async function PUT(request: Request) {
  try {
    const session = await requireRole(request, 'lead'); const projectId = projectIdForLead(session.subject); if (!projectId) return noStore({ error: 'Unknown lead account.' }, 401);
    const body = await request.json() as { rows?: Array<{ netid: string; acceptable: boolean }>; finalized?: boolean };
    const db = getDb();
    const [active, [project], [activeRun]] = await Promise.all([
      db.select({ netid: candidates.netid, rosterVersion: candidates.rosterVersion }).from(candidates).where(eq(candidates.active, true)),
      db.select().from(projects).where(eq(projects.id, projectId)).limit(1),
      db.select({ id: matchingRuns.id }).from(matchingRuns).where(eq(matchingRuns.status, 'provisional')).limit(1),
    ]);
    if (activeRun) return noStore({ error: 'Rankings are frozen while matching is in progress.' }, 409);
    const rows = body.rows ?? []; const activeIds = active.map((candidate) => candidate.netid);
    if (!project || rows.length !== activeIds.length || new Set(rows.map((row) => row.netid)).size !== activeIds.length || rows.some((row) => !activeIds.includes(row.netid))) return noStore({ error: 'Ranking must contain every active candidate exactly once.' }, 400);
    if (body.finalized && project.rankingRosterVersion && (project.rankingRosterVersion !== active[0]?.rosterVersion || project.rankingProjectVersion !== project.version)) return noStore({ error: 'This ranking is stale. Save or rerun ranking before finalizing.' }, 409);
    await db.delete(leadRankings).where(eq(leadRankings.projectId, projectId));
    await db.insert(leadRankings).values(rows.map((row, index) => ({ projectId, netid: row.netid, position: index + 1, acceptable: row.acceptable, updatedAt: new Date() })));
    await db.update(projects).set({ rankingFinalized: Boolean(body.finalized), rankingRosterVersion: active[0]?.rosterVersion ?? null, rankingProjectVersion: project.version, updatedAt: new Date() }).where(eq(projects.id, projectId));
    await db.insert(auditEvents).values({ id: crypto.randomUUID(), actor: session.subject, action: body.finalized ? 'lead_ranking_finalized' : 'lead_ranking_saved', entityType: 'project', entityId: projectId, detailJson: JSON.stringify({ acceptableCount: rows.filter((row) => row.acceptable).length }), createdAt: new Date() });
    return noStore({ ok: true, finalized: Boolean(body.finalized) });
  } catch (error) { if (error instanceof Response) return error; return noStore({ error: error instanceof Error ? error.message : 'Ranking could not be saved.' }, 500); }
}
