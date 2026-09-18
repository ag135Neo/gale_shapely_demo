export const PROJECT_COUNT = 2;

export const leadProjects = {
  'Proj 1': 'proj-1',
  'Proj 2': 'proj-2',
} as const;

export const leadAccounts: string[] = Object.keys(leadProjects);

export const seededProjects = (Object.entries(leadProjects) as Array<[keyof typeof leadProjects, string]>).map(
  ([username, id]) => [id, username] as const,
);

export function projectIdForLead(username: string) {
  return leadProjects[username as keyof typeof leadProjects];
}
