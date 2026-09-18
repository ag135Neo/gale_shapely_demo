import { assertSameOrigin, makeSessionCookie, matchesPassword } from '@/lib/auth';
import { allowLogin, clearFailures, loginKey, recordFailure } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { pin } = await request.json() as { pin?: string };
    const key = loginKey(request, 'admin');
    if (!(await allowLogin(key))) return Response.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
    if (!pin || !process.env.ADMIN_PIN_HASH || !(await matchesPassword(pin, process.env.ADMIN_PIN_HASH))) { await recordFailure(key); return Response.json({ error: 'Invalid Admin PIN.' }, { status: 401 }); }
    await clearFailures(key);
    return Response.json({ ok: true }, { headers: { 'set-cookie': await makeSessionCookie('admin', 'admin'), 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('Admin sign-in failed', error);
    return Response.json({ error: 'Admin sign-in is unavailable.' }, { status: 503 });
  }
}
