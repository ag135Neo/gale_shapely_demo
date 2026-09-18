import { readSession, type Role, type Session } from '@/lib/auth';

export async function requireRole(request: Request, role: Role): Promise<Session> {
  const session = await readSession(request);
  if (!session || session.role !== role) throw new Response(JSON.stringify({ error: 'Authentication is required.' }), { status: 401, headers: { 'content-type': 'application/json' } });
  return session;
}

export function noStore(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
