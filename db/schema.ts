import { boolean, index, integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

const date = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const candidates = pgTable('candidates', {
  netid: text('netid').primaryKey(), fullName: text('full_name').notNull(), grade: text('grade').notNull(), resumeUrl: text('resume_url').notNull(), applicationJson: text('application_json').notNull(), active: boolean('active').notNull().default(true), rosterVersion: text('roster_version').notNull(), updatedAt: date('updated_at').notNull(),
});

export const projects = pgTable('projects', {
  id: text('id').primaryKey(), accountUsername: text('account_username').notNull().unique(), name: text('name').notNull(), contactPersons: text('contact_persons').notNull(), projectManager: text('project_manager').notNull(), techLead: text('tech_lead').notNull(), description: text('description').notNull(), prdUrl: text('prd_url').notNull(), capacity: integer('capacity').notNull().default(0), version: integer('version').notNull().default(1), rankingFinalized: boolean('ranking_finalized').notNull().default(false), rankingRosterVersion: text('ranking_roster_version'), rankingProjectVersion: integer('ranking_project_version'), updatedAt: date('updated_at').notNull(),
});

export const candidateProfiles = pgTable('candidate_profiles', {
  netid: text('netid').primaryKey().references(() => candidates.netid), sourceFingerprint: text('source_fingerprint').notNull(), profileJson: text('profile_json').notNull(), model: text('model').notNull(), updatedAt: date('updated_at').notNull(),
});

export const aiRuns = pgTable('ai_runs', {
  id: text('id').primaryKey(), projectId: text('project_id').notNull().references(() => projects.id), status: text('status', { enum: ['running', 'published', 'failed'] }).notNull(), rosterVersion: text('roster_version').notNull(), projectVersion: integer('project_version').notNull(), error: text('error'), warningsJson: text('warnings_json').notNull().default('[]'), createdAt: date('created_at').notNull(), completedAt: date('completed_at'),
}, (table) => [index('idx_ai_runs_project').on(table.projectId)]);

export const aiScores = pgTable('ai_scores', {
  projectId: text('project_id').notNull().references(() => projects.id), netid: text('netid').notNull().references(() => candidates.netid), coreStack: integer('core_stack').notNull(), architecture: integer('architecture').notNull(), domain: integer('domain').notNull(), totalBasisPoints: integer('total_basis_points').notNull(), evidenceJson: text('evidence_json').notNull(), missingInformationJson: text('missing_information_json').notNull(), runId: text('run_id').notNull().references(() => aiRuns.id), createdAt: date('created_at').notNull(),
}, (table) => [primaryKey({ columns: [table.projectId, table.netid] }), index('idx_ai_scores_project').on(table.projectId)]);

export const leadRankings = pgTable('lead_rankings', {
  projectId: text('project_id').notNull().references(() => projects.id), netid: text('netid').notNull().references(() => candidates.netid), position: integer('position'), acceptable: boolean('acceptable').notNull().default(true), updatedAt: date('updated_at').notNull(),
}, (table) => [primaryKey({ columns: [table.projectId, table.netid] }), index('idx_lead_rankings_project_position').on(table.projectId, table.position)]);

export const engineerPreferences = pgTable('engineer_preferences', {
  netid: text('netid').primaryKey().references(() => candidates.netid), projectOrderJson: text('project_order_json').notNull(), finalized: boolean('finalized').notNull().default(false), updatedAt: date('updated_at').notNull(),
});

export const matchingRuns = pgTable('matching_runs', {
  id: text('id').primaryKey(), status: text('status', { enum: ['provisional', 'locked', 'cancelled'] }).notNull(), inputHash: text('input_hash').notNull(), resultJson: text('result_json').notNull(), emailStatus: text('email_status').notNull().default('not_sent'), resendId: text('resend_id'), createdAt: date('created_at').notNull(), lockedAt: date('locked_at'),
});

export const placements = pgTable('placements', {
  runId: text('run_id').notNull().references(() => matchingRuns.id), netid: text('netid').notNull().references(() => candidates.netid), projectId: text('project_id').notNull().references(() => projects.id), source: text('source', { enum: ['algorithm', 'admin_override'] }).notNull(), overriddenUnacceptable: boolean('overridden_unacceptable').notNull().default(false), createdAt: date('created_at').notNull(),
}, (table) => [primaryKey({ columns: [table.runId, table.netid] }), index('idx_placements_project').on(table.runId, table.projectId)]);

export const auditEvents = pgTable('audit_events', {
  id: text('id').primaryKey(), actor: text('actor').notNull(), action: text('action').notNull(), entityType: text('entity_type').notNull(), entityId: text('entity_id').notNull(), detailJson: text('detail_json').notNull(), createdAt: date('created_at').notNull(),
}, (table) => [index('idx_audit_events_entity').on(table.entityType, table.entityId)]);

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(), role: text('role', { enum: ['lead', 'engineer', 'admin'] }).notNull(), subject: text('subject').notNull(), expiresAt: date('expires_at').notNull(), createdAt: date('created_at').notNull(), revokedAt: date('revoked_at'),
}, (table) => [index('idx_sessions_subject').on(table.role, table.subject)]);

export const authRateLimits = pgTable('auth_rate_limits', {
  key: text('key').primaryKey(), attempts: integer('attempts').notNull().default(0), windowStartedAt: date('window_started_at').notNull(),
});
