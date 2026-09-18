import { getDb } from '@/db';
import { aiScores, candidates, leadRankings, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole, noStore } from '@/lib/api';
import { projectIdForLead } from '@/lib/projects';
import { synchronizeRoster } from '@/lib/roster-store';

export async function GET(request: Request) {
  try {
    const session = await requireRole(request, 'lead');
    const id = projectIdForLead(session.subject);
    if (!id) return noStore({ error: 'Unknown lead account.' }, 401);
    await synchronizeRoster(`lead:${session.subject}`);
    const db = getDb();
    const [[project], rankingRows, scoreRows, candidateRows] = await Promise.all([
      db.select().from(projects).where(eq(projects.id, id)).limit(1),
      db.select().from(leadRankings).where(eq(leadRankings.projectId, id)),
      db.select().from(aiScores).where(eq(aiScores.projectId, id)),
      db.select().from(candidates).where(eq(candidates.active, true)),
    ]);
    const rankingSource = rankingRows.length ? rankingRows : candidateRows.map((candidate, index) => ({ netid: candidate.netid, acceptable: true, position: index + 1 }));
    const ranking = rankingSource.sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER)).map((row) => ({ ...row, candidate: candidateRows.find((candidate) => candidate.netid === row.netid), score: scoreRows.find((score) => score.netid === row.netid) }));
    return noStore({ project, ranking, candidates: candidateRows });
  } catch (error) { if (error instanceof Response) return error; return noStore({ error: 'Project could not be loaded.' }, 500); }
}

export async function PUT(request: Request) {
  try {
    const session = await requireRole(request, 'lead');
    const id = projectIdForLead(session.subject);
    if (!id) return noStore({ error: 'Unknown lead account.' }, 401);
    const body = await request.json() as { name?: string; contactPersons?: string; projectManager?: string; techLead?: string; description?: string; prdUrl?: string; capacity?: number };
    if (!body.name?.trim() || !body.contactPersons?.trim() || !body.projectManager?.trim() || !body.techLead?.trim() || !body.description?.trim() || typeof body.capacity !== 'number' || !Number.isInteger(body.capacity) || body.capacity < 0) return noStore({ error: 'Complete all project fields and use a non-negative whole-number capacity.' }, 400);
    const db = getDb(); const [current] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!current) return noStore({ error: 'Project has not been initialized. Ask the Admin to synchronize the roster once.' }, 409);
    await db.update(projects).set({ name: body.name.trim(), contactPersons: body.contactPersons.trim(), projectManager: body.projectManager.trim(), techLead: body.techLead.trim(), description: body.description.trim(), prdUrl: body.prdUrl?.trim() ?? '', capacity: body.capacity, version: current.version + 1, rankingFinalized: false, rankingProjectVersion: null, updatedAt: new Date() }).where(eq(projects.id, id));
    return noStore({ ok: true, stale: true });
  } catch (error) { if (error instanceof Response) return error; return noStore({ error: 'Project could not be saved.' }, 500); }
}
