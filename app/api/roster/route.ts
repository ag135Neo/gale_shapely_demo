import { fetchHiredRoster } from '@/lib/roster';

export async function GET() {
  try {
    const roster = await fetchHiredRoster();
    return Response.json({ candidates: roster, synchronizedAt: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Roster validation failed.' }, { status: 422 });
  }
}
