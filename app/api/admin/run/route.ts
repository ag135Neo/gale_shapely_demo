import { getDb } from '@/db';
import { candidates, engineerPreferences, leadRankings, matchingRuns, placements, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole, noStore } from '@/lib/api';
import { isStableMatching, runDeferredAcceptance } from '@/lib/matching';
import { latestRosterSync } from '@/lib/roster-store';
import { PROJECT_COUNT } from '@/lib/projects';

async function digest(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: Request) {
  try {
    await requireRole(request, 'admin');
    const db = getDb();
    const [active, projectRows, rankingRows, preferenceRows, activeRuns] = await Promise.all([
      db.select({ netid: candidates.netid, rosterVersion: candidates.rosterVersion }).from(candidates).where(eq(candidates.active, true)),
      db.select().from(projects), db.select().from(leadRankings),
      db.select().from(engineerPreferences).where(eq(engineerPreferences.finalized, true)),
      db.select({ id: matchingRuns.id }).from(matchingRuns).where(eq(matchingRuns.status, 'provisional')),
    ]);
    const rosterVersion = active[0]?.rosterVersion;
    const rosterSync = await latestRosterSync();
    if (!rosterSync.valid || activeRuns.length || projectRows.length !== PROJECT_COUNT || projectRows.reduce((sum, project) => sum + project.capacity, 0) !== active.length || preferenceRows.length !== active.length || !projectRows.every((project) => project.rankingFinalized && project.rankingRosterVersion === rosterVersion && project.rankingProjectVersion === project.version)) return noStore({ error: rosterSync.valid ? 'Matching readiness is incomplete or another provisional run is active.' : `Roster synchronization is invalid: ${rosterSync.issues.join(' ')}` }, 409);
    const projectInput = projectRows.map((project) => ({ projectId: project.id, capacity: project.capacity, rankedNetids: rankingRows.filter((ranking) => ranking.projectId === project.id && ranking.acceptable).sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER)).map((ranking) => ranking.netid) }));
    const candidateInput = active.map((candidate) => {
      const preference = preferenceRows.find((row) => row.netid === candidate.netid);
      return { netid: candidate.netid, projectIds: JSON.parse(preference?.projectOrderJson ?? '[]') as string[] };
    });
    if (projectInput.some((project) => rankingRows.filter((ranking) => ranking.projectId === project.projectId).length !== active.length)) return noStore({ error: 'Every lead must finalize a complete ranking.' }, 409);
    const input = { projects: projectInput, candidates: candidateInput };
    const outcome = runDeferredAcceptance(projectInput, candidateInput);
    const stable = isStableMatching(projectInput, candidateInput, outcome.placements);
    if (!stable) throw new Error('The provisional result failed stability verification.');
    const id = crypto.randomUUID(); const now = new Date();
    await db.insert(matchingRuns).values({ id, status: 'provisional', inputHash: await digest(JSON.stringify(input)), resultJson: JSON.stringify({ input, stable, unmatchedNetids: outcome.unmatchedNetids, openSlots: outcome.openSlots }), createdAt: now });
    if (outcome.placements.length) await db.insert(placements).values(outcome.placements.map((placement) => ({ runId: id, netid: placement.netid, projectId: placement.projectId, source: 'algorithm' as const, overriddenUnacceptable: false, createdAt: now })));
    return noStore({ id, placements: outcome.placements, unmatchedNetids: outcome.unmatchedNetids, openSlots: outcome.openSlots, stable: true });
  } catch (error) { if (error instanceof Response) return error; return noStore({ error: error instanceof Error ? error.message : 'Matching run failed.' }, 500); }
}
