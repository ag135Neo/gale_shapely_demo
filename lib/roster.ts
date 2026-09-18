export type RosterCandidate = {
  netid: string;
  fullName: string;
  grade: string;
  resumeUrl: string;
  motivation: string;
  aiWorkflow: string;
  links: string;
  proudProject: string;
  interviewer?: string;
  interviewerNotes?: string;
};

export function hiredCsvUrl() {
  if (process.env.ROSTER_CSV_URL) return process.env.ROSTER_CSV_URL;
  if (process.env.GOOGLE_SHEET_ID) {
    const gid = process.env.GOOGLE_SHEET_GID ?? '0';
    return `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}/export?format=csv&gid=${gid}`;
  }
  const host = (process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || 'localhost:3000').replace(/^https?:\/\//, '');
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${host}/demo-hired.csv`;
}

export async function fetchHiredRoster(): Promise<RosterCandidate[]> {
  const { candidates, issues } = await loadHiredRoster();
  if (!candidates.length) throw new Error(issues[0] ?? 'The HIRED roster could not be read.');
  return candidates;
}

export async function loadHiredRoster(): Promise<{ candidates: RosterCandidate[]; issues: string[] }> {
  const response = await fetch(hiredCsvUrl(), { cache: 'no-store', redirect: 'follow' });
  if (!response.ok) throw new Error('The HIRED roster could not be read.');
  const csv = await response.text();
  if (!csv.trim() || csv.trimStart().startsWith('<')) throw new Error('The HIRED roster could not be read.');
  return inspectHiredRoster(csv);
}

const HEADER = {
  timestamp: 'Timestamp',
  firstName: 'First Name',
  lastName: 'Last Name',
  grade: 'Grade',
  resume: 'Upload your resume',
  motivation: 'Why do you want to be part of Revamp?',
  aiWorkflow: 'How do you use AI in your current workflow?',
  links: 'Any links you want to add (Eg LinkedIn, Github, Personal Website, etc.)',
  proudProject: 'What is one project you are really proud of? If you had to remake it today what would you change ?',
};

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === ',' && !quoted) { row.push(cell); cell = ''; continue; }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell); rows.push(row); row = []; cell = ''; continue;
    }
    cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export function netidFromEmails(primary: string, secondary: string): string {
  const candidates = [primary, secondary]
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.endsWith('@illinois.edu'))
    .map((email) => email.slice(0, -'@illinois.edu'.length));
  const unique = [...new Set(candidates)];
  if (unique.length !== 1 || !/^[a-z0-9]+$/.test(unique[0] ?? '')) {
    throw new Error('Roster row is missing a single valid Illinois NetID.');
  }
  return unique[0];
}

export function inspectHiredRoster(csv: string): { candidates: RosterCandidate[]; issues: string[] } {
  const [headers, ...rows] = parseCsv(csv).filter((row) => row.some((cell) => cell.trim()));
  if (!headers) return { candidates: [], issues: [] };
  const indexes = new Map<string, number>();
  headers.forEach((header, index) => { if (!indexes.has(header)) indexes.set(header, index); });
  const value = (row: string[], header: string) => row[indexes.get(header) ?? -1] ?? '';
  const issues: string[] = [];
  const parsed: RosterCandidate[] = [];
  for (const row of rows) {
    const fullName = `${value(row, HEADER.firstName).trim()} ${value(row, HEADER.lastName).trim()}`.trim();
    const primary = row[1] ?? '';
    const secondary = row[5] ?? '';
    if (!fullName && !primary.trim() && !secondary.trim()) continue;
    try {
      parsed.push({
        netid: netidFromEmails(primary, secondary),
        fullName,
        grade: value(row, HEADER.grade).trim(),
        resumeUrl: value(row, HEADER.resume).trim(),
        motivation: value(row, HEADER.motivation).trim(),
        aiWorkflow: value(row, HEADER.aiWorkflow).trim(),
        links: value(row, HEADER.links).trim(),
        proudProject: value(row, HEADER.proudProject).trim(),
        interviewer: value(row, 'INTERVIEWER').trim() || value(row, 'NTERVIEWER').trim() || undefined,
        interviewerNotes: value(row, 'INTERVIEWER NOTES').trim() || undefined,
      });
    } catch {
      issues.push(`${fullName || 'A HIRED row'} is missing a single valid Illinois NetID.`);
    }
  }
  const counts = new Map<string, number>();
  for (const candidate of parsed) counts.set(candidate.netid, (counts.get(candidate.netid) ?? 0) + 1);
  for (const [netid, count] of counts) {
    if (count > 1) issues.push(`Duplicate NetID: ${netid}`);
  }
  const candidates = parsed.filter((candidate) => counts.get(candidate.netid) === 1);
  return { candidates, issues };
}

export function parseHiredRoster(csv: string): RosterCandidate[] {
  const { candidates, issues } = inspectHiredRoster(csv);
  if (issues.length) throw new Error(issues[0]);
  return candidates;
}
