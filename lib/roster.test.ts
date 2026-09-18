import { describe, expect, it } from 'vitest';
import { inspectHiredRoster, netidFromEmails } from './roster';

describe('Illinois NetID extraction', () => {
  it('normalizes whitespace and case from either email column', () => {
    expect(netidFromEmails('person@gmail.com', '  AbC123@ILLINOIS.EDU ')).toBe('abc123');
  });

  it('rejects conflicting Illinois addresses', () => {
    expect(() => netidFromEmails('abc@illinois.edu', 'xyz@illinois.edu')).toThrow();
  });

  it('rejects missing or invalid NetIDs instead of sanitizing them', () => {
    expect(() => netidFromEmails('abc@gmail.com', '')).toThrow();
    expect(() => netidFromEmails('a.b@illinois.edu', '')).toThrow();
  });
});

describe('HIRED roster inspection', () => {
  const header = 'Timestamp,Email Address,First Name,Last Name,Phone,Email Address,Grade,Upload your resume,Why do you want to be part of Revamp?,How do you use AI in your current workflow?,"Any links you want to add (Eg LinkedIn, Github, Personal Website, etc.)",What is one project you are really proud of? If you had to remake it today what would you change ?';

  it('keeps valid candidates when one row is missing an Illinois NetID', () => {
    const csv = `${header}
1,valid@illinois.edu,Ada,Lovelace,1,ada@gmail.com,Senior,https://example.com/a.pdf,m,ai,links,project
2,akshathnag06@gmail.com,Akshath,Nagulapally,1,akshathnag06@gmail.com,Junior,https://example.com/b.pdf,m,ai,links,project`;
    const { candidates, issues } = inspectHiredRoster(csv);
    expect(candidates.map((candidate) => candidate.netid)).toEqual(['valid']);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('Akshath Nagulapally');
  });

  it('marks duplicate NetIDs invalid and drops both copies', () => {
    const csv = `${header}
1,dup@illinois.edu,One,Person,1,,Senior,https://example.com/a.pdf,m,ai,links,project
2,dup@illinois.edu,Two,Person,1,,Junior,https://example.com/b.pdf,m,ai,links,project`;
    const { candidates, issues } = inspectHiredRoster(csv);
    expect(candidates).toEqual([]);
    expect(issues[0]).toContain('Duplicate NetID: dup');
  });
});
