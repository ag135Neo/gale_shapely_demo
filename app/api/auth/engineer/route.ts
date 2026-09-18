import { assertSameOrigin, makeSessionCookie } from '@/lib/auth';
import { synchronizeRoster } from '@/lib/roster-store';

export async function GET(request: Request) {
  const netid = new URL(request.url).searchParams.get('netid')?.trim().toLowerCase() ?? '';
  if (!/^[a-z0-9]+$/.test(netid)) return Response.json({ error: 'Enter a valid Illinois NetID.' }, { status: 400 });
  try {
    const candidate = (await synchronizeRoster(`engineer_lookup:${netid}`)).roster.find((item) => item.netid === netid);
    return candidate ? Response.json({ netid: candidate.netid, fullName: candidate.fullName, grade: candidate.grade }, { headers: { 'cache-control': 'no-store' } }) : Response.json({ error: 'That active NetID was not found in HIRED.' }, { status: 404 });
  } catch (error) {
    console.error('Engineer roster lookup failed', error);
    return Response.json({ error: 'Roster lookup is temporarily unavailable.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { netid } = await request.json() as { netid?: string };
    const normalized = netid?.trim().toLowerCase() ?? '';
    const candidate = (await synchronizeRoster(`engineer_confirm:${normalized}`)).roster.find((item) => item.netid === normalized);
    if (!candidate) return Response.json({ error: 'That active NetID was not found in HIRED.' }, { status: 404 });
    return Response.json({ netid: candidate.netid, fullName: candidate.fullName }, { headers: { 'set-cookie': await makeSessionCookie('engineer', candidate.netid), 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('Engineer confirmation failed', error);
    return Response.json({ error: 'Engineer confirmation is unavailable.' }, { status: 503 });
  }
}
