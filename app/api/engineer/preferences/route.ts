import { getDb } from '@/db';
import { engineerPreferences, matchingRuns, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole, noStore } from '@/lib/api';

export async function PUT(request: Request) {
  try {
    const session = await requireRole(request, 'engineer');
    const body = await request.json() as { projectIds?: string[]; finalized?: boolean };
    const allProjects = await getDb().select({ id: projects.id }).from(projects);
    const ids = body.projectIds ?? [];
    if (ids.length !== allProjects.length || new Set(ids).size !== allProjects.length || ids.some((id) => !allProjects.some((project) => project.id === id))) return noStore({ error: 'Rank each project exactly once.' }, 400);
    const [activeRun] = await getDb().select({ id: matchingRuns.id }).from(matchingRuns).where(eq(matchingRuns.status, 'provisional')).limit(1);
    if (activeRun) return noStore({ error: 'Preferences are frozen while matching is in progress.' }, 409);
    await getDb().insert(engineerPreferences).values({ netid: session.subject, projectOrderJson: JSON.stringify(ids), finalized: Boolean(body.finalized), updatedAt: new Date() }).onConflictDoUpdate({ target: engineerPreferences.netid, set: { projectOrderJson: JSON.stringify(ids), finalized: Boolean(body.finalized), updatedAt: new Date() } });
    return noStore({ netid: session.subject, finalized: Boolean(body.finalized) });
  } catch (error) { if (error instanceof Response) return error; return noStore({ error: 'Preferences could not be saved.' }, 500); }
}

export async function GET(request: Request) {
  try {
    const session = await requireRole(request, 'engineer');
    const [preference] = await getDb().select().from(engineerPreferences).where(eq(engineerPreferences.netid, session.subject)).limit(1);
    return noStore({ preference: preference ? { projectIds: JSON.parse(preference.projectOrderJson), finalized: preference.finalized } : null });
  } catch (error) { if (error instanceof Response) return error; return noStore({ error: 'Preferences could not be loaded.' }, 500); }
}
