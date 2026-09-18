import { getDb } from '@/db';
import { Buffer } from 'node:buffer';
import { candidates, matchingRuns, placements, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';

const recipient = process.env.RESULTS_TO_EMAIL ?? 'ag135@illinois.edu';
const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character));
const csvCell = (value: string) => `"${value.replaceAll('"', '""')}"`;

export async function placementReport(runId: string) {
  const db = getDb();
  const [[run], rows, projectRows] = await Promise.all([
    db.select().from(matchingRuns).where(eq(matchingRuns.id, runId)).limit(1),
    db.select().from(placements).where(eq(placements.runId, runId)),
    db.select().from(projects),
  ]);
  if (!run) throw new Error('Matching run not found.');
  const candidateRows = await db.select().from(candidates);
  const report = rows.map((placement) => ({ netid: placement.netid, fullName: candidateRows.find((candidate) => candidate.netid === placement.netid)?.fullName ?? placement.netid, project: projectRows.find((project) => project.id === placement.projectId)?.name ?? placement.projectId, source: placement.source === 'algorithm' ? 'Gale-Shapley' : 'Admin override' }));
  return { run, report, projectRows };
}

export async function deliverPlacementReport(runId: string, apiKey: string, from: string) {
  const { report } = await placementReport(runId);
  const csv = ['NetID,Full Name,Project,Assignment Source', ...report.map((row) => [row.netid, row.fullName, row.project, row.source].map(csvCell).join(','))].join('\n');
  const html = `<h2>Revamp Team Placements</h2><table border="1" cellpadding="6" cellspacing="0"><thead><tr><th>NetID</th><th>Full name</th><th>Project</th><th>Assignment source</th></tr></thead><tbody>${report.map((row) => `<tr><td>${escape(row.netid)}</td><td>${escape(row.fullName)}</td><td>${escape(row.project)}</td><td>${escape(row.source)}</td></tr>`).join('')}</tbody></table>`;
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ from, to: [recipient], subject: 'Revamp team placement results', html, attachments: [{ filename: 'revamp-placements.csv', content: Buffer.from(csv, 'utf8').toString('base64') }] }) });
  const payload = await response.json() as { id?: string; message?: string };
  if (!response.ok || !payload.id) throw new Error(payload.message ?? 'Resend did not accept the placement report.');
  return payload.id;
}
