import { requireRole, noStore } from '@/lib/api';
import { synchronizeRoster } from '@/lib/roster-store';

export async function POST(request: Request) {
  try {
    const session = await requireRole(request, 'admin');
    const { roster, version, changed, valid, issues } = await synchronizeRoster(session.subject);
    return noStore({ valid, activeCount: roster.length, rosterVersion: version, changed, issues });
  } catch (error) {
    if (error instanceof Response) return error;
    return noStore({ error: error instanceof Error ? error.message : 'Roster sync failed.' }, 422);
  }
}
