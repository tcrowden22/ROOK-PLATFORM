import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users, organizations } from './muninn';

// Enums
export const workflowStatusEnum = pgEnum('workflow_status', ['active', 'paused', 'disabled']);
export const workflowTriggerTypeEnum = pgEnum('workflow_trigger_type', ['manual', 'scheduled', 'event']);
export const triggerTypeEnum = pgEnum('trigger_type', ['webhook', 'schedule', 'event', 'manual']);
export const integrationStatusEnum = pgEnum('integration_status', ['connected', 'disconnected', 'error']);
export const runLogStatusEnum = pgEnum('run_log_status', ['running', 'success', 'failed', 'cancelled']);

// Tables
export const workflows = pgTable({ name: 'workflows', schema: 'yggdrasil' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  status: workflowStatusEnum('status').notNull().default('active'),
  triggerType: workflowTriggerTypeEnum('trigger_type').notNull(),
  definition: jsonb('definition').default({}),
  createdBy: uuid('created_by').references(() => users.id),
  organizationId: uuid('organization_id').references(() => organizations.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  runCount: integer('run_count').default(0),
}, (table) => ({
  statusIdx: index('idx_workflows_status').on(table.status),
  createdByIdx: index('idx_workflows_created_by').on(table.createdBy),
  organizationIdx: index('idx_workflows_organization_id').on(table.organizationId),
}));

export const workflowTriggers = pgTable({ name: 'workflow_triggers', schema: 'yggdrasil' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: triggerTypeEnum('type').notNull(),
  enabled: boolean('enabled').default(true),
  config: jsonb('config').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  workflowIdx: index('idx_workflow_triggers_workflow_id').on(table.workflowId),
  enabledIdx: index('idx_workflow_triggers_enabled').on(table.enabled),
}));

export const workflowIntegrations = pgTable({ name: 'workflow_integrations', schema: 'yggdrasil' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  status: integrationStatusEnum('status').notNull().default('disconnected'),
  config: jsonb('config').default({}),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  typeIdx: index('idx_workflow_integrations_type').on(table.type),
  statusIdx: index('idx_workflow_integrations_status').on(table.status),
}));

export const workflowRunLogs = pgTable({ name: 'workflow_run_logs', schema: 'yggdrasil' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  workflowName: text('workflow_name').notNull(),
  status: runLogStatusEnum('status').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  durationMs: integer('duration_ms'),
  triggerType: text('trigger_type').notNull(),
  errorMessage: text('error_message'),
  stepsCompleted: integer('steps_completed').default(0),
  stepsTotal: integer('steps_total').default(0),
  payload: jsonb('payload').default({}),
}, (table) => ({
  workflowIdx: index('idx_workflow_run_logs_workflow_id').on(table.workflowId),
  statusIdx: index('idx_workflow_run_logs_status').on(table.status),
  startedAtIdx: index('idx_workflow_run_logs_started_at').on(table.startedAt),
}));

// Relations
export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  creator: one(users, { fields: [workflows.createdBy], references: [users.id] }),
  triggers: many(workflowTriggers),
  runLogs: many(workflowRunLogs),
}));

export const workflowTriggersRelations = relations(workflowTriggers, ({ one }) => ({
  workflow: one(workflows, { fields: [workflowTriggers.workflowId], references: [workflows.id] }),
}));

export const workflowRunLogsRelations = relations(workflowRunLogs, ({ one }) => ({
  workflow: one(workflows, { fields: [workflowRunLogs.workflowId], references: [workflows.id] }),
}));

