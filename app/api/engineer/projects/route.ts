import { getDb } from '@/db';
import { projects } from '@/db/schema';
import { requireRole, noStore } from '@/lib/api';

export async function GET(request: Request) {
  try {
    await requireRole(request, 'engineer');
    const rows = await getDb().select({ id: projects.id, name: projects.name, contactPersons: projects.contactPersons, projectManager: projects.projectManager, techLead: projects.techLead, description: projects.description, capacity: projects.capacity }).from(projects);
    return noStore({ projects: rows });
  } catch (error) { if (error instanceof Response) return error; return noStore({ error: 'Projects could not be loaded.' }, 500); }
}
