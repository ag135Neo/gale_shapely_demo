import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { sessions } from '@/db/schema';

export type Role = 'lead' | 'engineer' | 'admin';
export type Session = { id: string; role: Role; subject: string; expiresAt: number };

const encoder = new TextEncoder();
const cookieName = 'revamp_session';

function b64(bytes: Uint8Array) {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

function fromB64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function hmac(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('Session signing is not configured.');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

export async function makeSessionCookie(role: Role, subject: string) {
  const session: Session = { id: crypto.randomUUID(), role, subject, expiresAt: Date.now() + 1000 * 60 * 60 * 8 };
  await getDb().insert(sessions).values({ id: session.id, role, subject, expiresAt: new Date(session.expiresAt), createdAt: new Date() });
  const payload = b64(encoder.encode(JSON.stringify(session)));
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${cookieName}=${payload}.${await hmac(payload)}; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=28800`;
}

export async function readSession(request: Request): Promise<Session | null> {
  const raw = request.headers.get('cookie')?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!raw) return null;
  const [payload, signature] = raw.split('.');
  if (!payload || !signature || signature !== await hmac(payload)) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(fromB64(payload))) as Session;
    if (parsed.expiresAt <= Date.now()) return null;
    const [stored] = await getDb().select().from(sessions).where(eq(sessions.id, parsed.id)).limit(1);
    return stored && !stored.revokedAt && stored.expiresAt.getTime() > Date.now() && stored.role === parsed.role && stored.subject === parsed.subject ? parsed : null;
  } catch { return null; }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) {
    const site = request.headers.get('sec-fetch-site');
    if (site === 'same-origin') return;
    throw new Error('Invalid request origin.');
  }
  const originHost = new URL(origin).host.replace(/:\d+$/, '').toLowerCase();
  const allowed = [request.headers.get('host'), request.headers.get('x-forwarded-host')?.split(',')[0]?.trim(), process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_BRANCH_URL]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.replace(/^https?:\/\//, '').split(':')[0].toLowerCase());
  if (!allowed.includes(originHost)) throw new Error('Invalid request origin.');
}

/** PBKDF2 encoded as `base64(salt):base64(hash)`; values are deployment secrets. */
export async function matchesPassword(value: string, encoded: string) {
  try {
    const [saltEncoded, hashEncoded] = encoded.trim().split(':');
    if (!saltEncoded || !hashEncoded) return false;
    const salt = fromB64(saltEncoded);
    const expected = fromB64(hashEncoded);
    if (!salt.byteLength || !expected.byteLength) return false;
    const key = await crypto.subtle.importKey('raw', encoder.encode(value), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 310_000, hash: 'SHA-256' }, key, expected.byteLength * 8);
    const actual = new Uint8Array(bits);
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
    return difference === 0;
  } catch {
    return false;
  }
}

export function expiredCookie() { const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''; return `${cookieName}=; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=0`; }
