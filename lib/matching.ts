export type ProjectPreference = {
  projectId: string;
  capacity: number;
  rankedNetids: string[];
};

export type CandidatePreference = {
  netid: string;
  projectIds: string[];
};

export type Placement = {
  netid: string;
  projectId: string;
  source: 'algorithm' | 'admin_override';
};

export type MatchResult = {
  placements: Placement[];
  unmatchedNetids: string[];
  openSlots: Record<string, number>;
};

/** Project-proposing, many-to-one deferred acceptance. */
export function runDeferredAcceptance(
  projects: ProjectPreference[],
  candidates: CandidatePreference[],
): MatchResult {
  const projectById = new Map(projects.map((project) => [project.projectId, project]));
  const candidateById = new Map(candidates.map((candidate) => [candidate.netid, candidate]));
  const nextChoice = new Map(projects.map((project) => [project.projectId, 0]));
  const heldByCandidate = new Map<string, string>();
  const acceptedByProject = new Map(projects.map((project) => [project.projectId, new Set<string>()]));
  const queue = projects.map((project) => project.projectId);

  while (queue.length) {
    const projectId = queue.shift()!;
    const project = projectById.get(projectId)!;
    const accepted = acceptedByProject.get(projectId)!;
    let cursor = nextChoice.get(projectId)!;

    while (accepted.size < project.capacity && cursor < project.rankedNetids.length) {
      const netid = project.rankedNetids[cursor++];
      const candidate = candidateById.get(netid);
      if (!candidate) continue;

      const currentProjectId = heldByCandidate.get(netid);
      if (!currentProjectId) {
        heldByCandidate.set(netid, projectId);
        accepted.add(netid);
        continue;
      }

      const preference = candidate.projectIds;
      if (preference.indexOf(projectId) < preference.indexOf(currentProjectId)) {
        heldByCandidate.set(netid, projectId);
        accepted.add(netid);
        const previousAccepted = acceptedByProject.get(currentProjectId)!;
        previousAccepted.delete(netid);
        queue.push(currentProjectId);
      }
    }

    nextChoice.set(projectId, cursor);
    if (accepted.size < project.capacity && cursor < project.rankedNetids.length) {
      queue.push(projectId);
    }
  }

  const placements = [...heldByCandidate.entries()].map(([netid, projectId]) => ({
    netid,
    projectId,
    source: 'algorithm' as const,
  }));
  const matched = new Set(placements.map((placement) => placement.netid));
  const openSlots = Object.fromEntries(
    projects.map((project) => [
      project.projectId,
      project.capacity - (acceptedByProject.get(project.projectId)?.size ?? 0),
    ]),
  );

  return {
    placements,
    unmatchedNetids: candidates.filter((candidate) => !matched.has(candidate.netid)).map((candidate) => candidate.netid),
    openSlots,
  };
}

export function isStableMatching(
  projects: ProjectPreference[],
  candidates: CandidatePreference[],
  placements: Placement[],
): boolean {
  const placementByCandidate = new Map(placements.map((placement) => [placement.netid, placement.projectId]));
  const projectMembers = new Map(projects.map((project) => [project.projectId, new Set<string>()]));
  for (const placement of placements) projectMembers.get(placement.projectId)?.add(placement.netid);

  for (const project of projects) {
    const members = projectMembers.get(project.projectId)!;
    for (const netid of project.rankedNetids) {
      const candidate = candidates.find((item) => item.netid === netid);
      if (!candidate) continue;
      const current = placementByCandidate.get(netid);
      const candidatePrefersProject = !current || candidate.projectIds.indexOf(project.projectId) < candidate.projectIds.indexOf(current);
      const projectHasRoom = members.size < project.capacity;
      const projectPrefersCandidate = !projectHasRoom && [...members].some(
        (member) => project.rankedNetids.indexOf(netid) < project.rankedNetids.indexOf(member),
      );
      if (candidatePrefersProject && (projectHasRoom || projectPrefersCandidate)) return false;
    }
  }
  return true;
}
