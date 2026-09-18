import { assertSameOrigin, makeSessionCookie, matchesPassword } from '@/lib/auth';
import { allowLogin, clearFailures, loginKey, recordFailure } from '@/lib/rate-limit';
import { leadProjects } from '@/lib/projects';

const projects: Record<string, string> = { ...leadProjects };

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { username, password } = await request.json() as { username?: string; password?: string };
    const key = loginKey(request, `lead:${username ?? 'unknown'}`);
    if (!(await allowLogin(key))) return Response.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
    const hashes = JSON.parse(process.env.LEAD_CREDENTIAL_HASHES_JSON ?? '{}') as Record<string, string>;
    if (!username || !password || !projects[username] || !hashes[username] || !(await matchesPassword(password, hashes[username]))) {
      await recordFailure(key); return Response.json({ error: 'Invalid lead credentials.' }, { status: 401 });
    }
    await clearFailures(key);
    return Response.json({ projectId: projects[username] }, { headers: { 'set-cookie': await makeSessionCookie('lead', username), 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('Lead sign-in failed', error);
    return Response.json({ error: 'Lead sign-in is unavailable.' }, { status: 503 });
  }
}
