import { getDb } from '@/db';
import { aiScores, candidates, engineerPreferences, leadRankings, matchingRuns, placements, projects } from '@/db/schema';
import { desc, eq, ne } from 'drizzle-orm';
import { requireRole, noStore } from '@/lib/api';

export async function GET(request: Request) {
  try {
    await requireRole(request, 'admin'); const db = getDb();
    const [run] = await db.select().from(matchingRuns).where(ne(matchingRuns.status, 'cancelled')).orderBy(desc(matchingRuns.createdAt)).limit(1);
    const [projectRows, candidateRows] = await Promise.all([db.select().from(projects), db.select().from(candidates).where(eq(candidates.active, true))]);
    if (!run) return noStore({ run: null, projects: projectRows, candidates: candidateRows });
    const [placementRows, preferenceRows, rankingRows, scoreRows] = await Promise.all([db.select().from(placements).where(eq(placements.runId, run.id)), db.select().from(engineerPreferences), db.select().from(leadRankings), db.select().from(aiScores)]);
    const placed = new Set(placementRows.map((placement) => placement.netid));
    const unmatched = candidateRows.filter((candidate) => !placed.has(candidate.netid)).map((candidate) => ({ netid: candidate.netid, fullName: candidate.fullName, projectIds: JSON.parse(preferenceRows.find((preference) => preference.netid === candidate.netid)?.projectOrderJson ?? '[]') as string[], projects: projectRows.map((project) => { const score = scoreRows.find((row) => row.projectId === project.id && row.netid === candidate.netid); const ranking = rankingRows.find((row) => row.projectId === project.id && row.netid === candidate.netid); return { projectId: project.id, projectName: project.name, unacceptable: ranking ? !ranking.acceptable : true, aiTotal: score ? score.totalBasisPoints / 100 : null }; }) }));
    const openSlots = Object.fromEntries(projectRows.map((project) => [project.id, project.capacity - placementRows.filter((placement) => placement.projectId === project.id).length]));
    return noStore({ run, placements: placementRows, unmatched, openSlots, projects: projectRows, candidates: candidateRows });
  } catch (error) { if (error instanceof Response) return error; return noStore({ error: 'Matching state could not be loaded.' }, 500); }
}
