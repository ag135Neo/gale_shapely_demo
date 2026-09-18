import { getDb } from '@/db';
import { candidates, engineerPreferences, leadRankings, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole, noStore } from '@/lib/api';
import { latestRosterSync } from '@/lib/roster-store';
import { PROJECT_COUNT } from '@/lib/projects';

export async function GET(request: Request) {
  try {
    await requireRole(request, 'admin');
    const db = getDb();
    const [active, projectRows, rankings, preferences, rosterSync] = await Promise.all([
      db.select({ netid: candidates.netid }).from(candidates).where(eq(candidates.active, true)),
      db.select().from(projects),
      db.select().from(leadRankings),
      db.select().from(engineerPreferences).where(eq(engineerPreferences.finalized, true)),
      latestRosterSync(),
    ]);
    const completeProjects = projectRows.length === PROJECT_COUNT && projectRows.every((project) => Boolean(project.name && project.contactPersons && project.projectManager && project.techLead && project.description) && project.capacity >= 0);
    const rosterVersion = active[0]?.netid ? (await db.select({ rosterVersion: candidates.rosterVersion }).from(candidates).where(eq(candidates.netid, active[0].netid)).limit(1))[0]?.rosterVersion : null;
    const completeRanks = projectRows.length === PROJECT_COUNT && projectRows.every((project) => project.rankingFinalized && project.rankingRosterVersion === rosterVersion && project.rankingProjectVersion === project.version && rankings.filter((ranking) => ranking.projectId === project.id).length === active.length);
    const rosterValid = rosterSync.valid && active.length > 0;
    return noStore({ rosterValid, issues: rosterSync.issues, activeCount: active.length, capacity: projectRows.reduce((sum, project) => sum + project.capacity, 0), completeProjects, completeRanks, finalizedPreferences: preferences.length, ready: rosterValid && completeProjects && completeRanks && preferences.length === active.length && projectRows.reduce((sum, project) => sum + project.capacity, 0) === active.length });
  } catch (error) { if (error instanceof Response) return error; return noStore({ error: 'Readiness could not be calculated.' }, 500); }
}
