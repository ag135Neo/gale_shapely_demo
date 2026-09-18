import { describe, expect, it } from 'vitest';
import { isStableMatching, runDeferredAcceptance } from './matching';

describe('project-proposing deferred acceptance', () => {
  it('respects capacities and engineer preferences', () => {
    const projects = [{ projectId: 'a', capacity: 1, rankedNetids: ['x', 'y'] }, { projectId: 'b', capacity: 1, rankedNetids: ['x', 'y'] }];
    const candidates = [{ netid: 'x', projectIds: ['b', 'a'] }, { netid: 'y', projectIds: ['a', 'b'] }];
    const result = runDeferredAcceptance(projects, candidates);
    expect(result.placements).toEqual(expect.arrayContaining([{ netid: 'x', projectId: 'b', source: 'algorithm' }, { netid: 'y', projectId: 'a', source: 'algorithm' }]));
    expect(isStableMatching(projects, candidates, result.placements)).toBe(true);
  });

  it('leaves excluded candidates unmatched and reports the open slot', () => {
    const projects = [{ projectId: 'a', capacity: 2, rankedNetids: ['x'] }];
    const candidates = [{ netid: 'x', projectIds: ['a'] }, { netid: 'y', projectIds: ['a'] }];
    const result = runDeferredAcceptance(projects, candidates);
    expect(result.unmatchedNetids).toEqual(['y']);
    expect(result.openSlots).toEqual({ a: 1 });
  });
});
