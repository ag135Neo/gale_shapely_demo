import { getDb } from '@/db';
import { auditEvents, candidates, projects } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { loadHiredRoster } from '@/lib/roster';
import { seededProjects } from '@/lib/projects';

async function sha256(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function ensureProjects() {
  const db = getDb(); const now = new Date();
  for (const [id, username] of seededProjects) {
    await db.insert(projects).values({
      id,
      accountUsername: username,
      name: username,
      contactPersons: 'Demo contact',
      projectManager: 'Demo PM',
      techLead: username,
      description: `${username} is a demo placement project. Stack: TypeScript and React. Architecture: serverless Next.js. Domain: internal tooling. Role: full-stack intern.`,
      prdUrl: '',
      capacity: 3,
      version: 1,
      rankingFinalized: false,
      updatedAt: now,
    }).onConflictDoNothing();
  }
}

export async function synchronizeRoster(actor: string) {
  const { candidates: roster, issues } = await loadHiredRoster();
  const valid = issues.length === 0;
  const normalized = roster.map((candidate) => ({ ...candidate, interviewer: candidate.interviewer ?? '', interviewerNotes: candidate.interviewerNotes ?? '' })).sort((a, b) => a.netid.localeCompare(b.netid));
  const version = await sha256(JSON.stringify(normalized));
  const db = getDb(); const now = new Date();
  const [previous] = await db.select({ rosterVersion: candidates.rosterVersion }).from(candidates).where(eq(candidates.active, true)).limit(1);
  await ensureProjects();
  await db.update(candidates).set({ active: false, updatedAt: now });
  for (const candidate of roster) {
    const applicationJson = JSON.stringify({ motivation: candidate.motivation, aiWorkflow: candidate.aiWorkflow, links: candidate.links, proudProject: candidate.proudProject, interviewer: candidate.interviewer, interviewerNotes: candidate.interviewerNotes });
    await db.insert(candidates).values({ netid: candidate.netid, fullName: candidate.fullName, grade: candidate.grade, resumeUrl: candidate.resumeUrl, applicationJson, active: true, rosterVersion: version, updatedAt: now }).onConflictDoUpdate({ target: candidates.netid, set: { fullName: candidate.fullName, grade: candidate.grade, resumeUrl: candidate.resumeUrl, applicationJson, active: true, rosterVersion: version, updatedAt: now } });
  }
  if (previous && previous.rosterVersion !== version) await db.update(projects).set({ rankingFinalized: false, rankingRosterVersion: null, updatedAt: now });
  await db.insert(auditEvents).values({ id: crypto.randomUUID(), actor, action: 'roster_synchronized', entityType: 'roster', entityId: version, detailJson: JSON.stringify({ activeCount: roster.length, changed: previous?.rosterVersion !== version, valid, issues }), createdAt: now });
  return { roster, version, changed: previous?.rosterVersion !== version, valid, issues };
}

export async function latestRosterSync() {
  const [event] = await getDb().select().from(auditEvents).where(eq(auditEvents.action, 'roster_synchronized')).orderBy(desc(auditEvents.createdAt)).limit(1);
  if (!event) return { valid: false, issues: ['The HIRED roster has not been synchronized.'] };
  try {
    const detail = JSON.parse(event.detailJson) as { valid?: boolean; issues?: string[] };
    return { valid: detail.valid !== false, issues: detail.issues ?? [] };
  } catch {
    return { valid: false, issues: ['The latest roster synchronization record is unreadable.'] };
  }
}
