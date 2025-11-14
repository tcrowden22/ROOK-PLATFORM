import { pgTable, uuid, text, timestamp, pgEnum, jsonb, index, numeric } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users, organizations } from './muninn';
import { devices } from './huginn';

// Enums
export const ticketTypeEnum = pgEnum('ticket_type', ['incident', 'request']);
export const ticketStatusEnum = pgEnum('ticket_status', ['new', 'in_progress', 'waiting', 'resolved', 'closed']);
export const ticketPriorityEnum = pgEnum('ticket_priority', ['low', 'medium', 'high', 'critical']);
export const changeStatusEnum = pgEnum('change_status', ['draft', 'pending_approval', 'approved', 'scheduled', 'in_progress', 'completed', 'failed', 'cancelled']);
export const changeRiskEnum = pgEnum('change_risk', ['low', 'medium', 'high']);

// Legacy tickets table
export const tickets = pgTable({ name: 'tickets', schema: 'sigurd' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  type: ticketTypeEnum('type').notNull(),
  status: ticketStatusEnum('status').notNull().default('new'),
  priority: ticketPriorityEnum('priority').notNull().default('medium'),
  requesterUserId: uuid('requester_user_id').notNull().references(() => users.id),
  assigneeUserId: uuid('assignee_user_id').references(() => users.id),
  deviceId: uuid('device_id').references(() => devices.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  breachAt: timestamp('breach_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  statusIdx: index('idx_tickets_status').on(table.status),
  requesterIdx: index('idx_tickets_requester').on(table.requesterUserId),
  assigneeIdx: index('idx_tickets_assignee').on(table.assigneeUserId),
  deviceIdx: index('idx_tickets_device').on(table.deviceId),
  organizationIdx: index('idx_tickets_organization_id').on(table.organizationId),
}));

export const comments = pgTable({ name: 'comments', schema: 'sigurd' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  authorUserId: uuid('author_user_id').notNull().references(() => users.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const knowledgeArticles = pgTable({ name: 'knowledge_articles', schema: 'sigurd' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  title: text('title').notNull(),
  body: text('body').notNull(),
  tags: text('tags').array().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const serviceCatalogItems = pgTable({ name: 'service_catalog_items', schema: 'sigurd' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  description: text('description').notNull(),
  category: text('category'),
  formSchema: jsonb('form_schema'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  categoryIdx: index('idx_service_catalog_category').on(table.category),
}));

// ITIL tables
export const incidents = pgTable({ name: 'incidents', schema: 'sigurd' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  status: ticketStatusEnum('status').notNull().default('new'),
  priority: ticketPriorityEnum('priority').notNull().default('medium'),
  requesterUserId: uuid('requester_user_id').notNull().references(() => users.id),
  assigneeUserId: uuid('assignee_user_id').references(() => users.id),
  deviceId: uuid('device_id').references(() => devices.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  impact: text('impact'),
  urgency: text('urgency'),
  breachAt: timestamp('breach_at', { withTimezone: true }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  statusIdx: index('idx_incidents_status').on(table.status),
  assigneeIdx: index('idx_incidents_assignee').on(table.assigneeUserId),
  organizationIdx: index('idx_incidents_organization_id').on(table.organizationId),
}));

export const serviceRequests = pgTable({ name: 'service_requests', schema: 'sigurd' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  status: ticketStatusEnum('status').notNull().default('new'),
  priority: ticketPriorityEnum('priority').notNull().default('medium'),
  requesterUserId: uuid('requester_user_id').notNull().references(() => users.id),
  assigneeUserId: uuid('assignee_user_id').references(() => users.id),
  catalogItemId: uuid('catalog_item_id').references(() => serviceCatalogItems.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  fulfillmentNotes: text('fulfillment_notes'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  statusIdx: index('idx_service_requests_status').on(table.status),
  assigneeIdx: index('idx_service_requests_assignee').on(table.assigneeUserId),
  organizationIdx: index('idx_service_requests_organization_id').on(table.organizationId),
}));

export const problems = pgTable({ name: 'problems', schema: 'sigurd' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  status: ticketStatusEnum('status').notNull().default('new'),
  priority: ticketPriorityEnum('priority').notNull().default('medium'),
  assignedUserId: uuid('assigned_user_id').references(() => users.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  rootCause: text('root_cause'),
  workaround: text('workaround'),
  resolution: text('resolution'),
  relatedIncidents: uuid('related_incidents').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  statusIdx: index('idx_problems_status').on(table.status),
  organizationIdx: index('idx_problems_organization_id').on(table.organizationId),
}));

export const changes = pgTable({ name: 'changes', schema: 'sigurd' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  status: changeStatusEnum('status').notNull().default('draft'),
  risk: changeRiskEnum('risk').notNull().default('medium'),
  requesterUserId: uuid('requester_user_id').notNull().references(() => users.id),
  assignedUserId: uuid('assigned_user_id').references(() => users.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  reason: text('reason').notNull(),
  impactAnalysis: text('impact_analysis'),
  rollbackPlan: text('rollback_plan'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  scheduledStart: timestamp('scheduled_start', { withTimezone: true }),
  scheduledEnd: timestamp('scheduled_end', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  statusIdx: index('idx_changes_status').on(table.status),
  organizationIdx: index('idx_changes_organization_id').on(table.organizationId),
}));

export const ticketComments = pgTable({ name: 'ticket_comments', schema: 'sigurd' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketType: text('ticket_type').notNull(), // 'incident' | 'service_request' | 'problem' | 'change'
  ticketId: uuid('ticket_id').notNull(),
  authorUserId: uuid('author_user_id').notNull().references(() => users.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  body: text('body').notNull(),
  mentions: jsonb('mentions').default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  ticketIdx: index('idx_ticket_comments_ticket').on(table.ticketType, table.ticketId),
  organizationIdx: index('idx_ticket_comments_organization_id').on(table.organizationId),
}));

export const sigurdTicketHistory = pgTable({ name: 'sigurd_ticket_history', schema: 'sigurd' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketType: text('ticket_type').notNull(),
  ticketId: uuid('ticket_id').notNull(),
  userId: uuid('user_id').references(() => users.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  action: text('action').notNull(),
  fieldName: text('field_name'),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  ticketIdx: index('idx_sigurd_history_ticket').on(table.ticketId),
  createdAtIdx: index('idx_sigurd_history_created').on(table.createdAt),
  organizationIdx: index('idx_sigurd_history_organization_id').on(table.organizationId),
}));

export const attachments = pgTable({ name: 'attachments', schema: 'sigurd' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketType: text('ticket_type').notNull(), // 'incident' | 'service_request' | 'problem' | 'change'
  ticketId: uuid('ticket_id').notNull(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: numeric('file_size', { precision: 20, scale: 0 }).notNull(), // Using numeric for bigint support
  mimeType: text('mime_type').notNull(),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  ticketIdx: index('idx_attachments_ticket').on(table.ticketType, table.ticketId),
  uploadedByIdx: index('idx_attachments_uploaded_by').on(table.uploadedBy),
  organizationIdx: index('idx_attachments_organization_id').on(table.organizationId),
}));

// Relations
export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  requester: one(users, { fields: [tickets.requesterUserId], references: [users.id] }),
  assignee: one(users, { fields: [tickets.assigneeUserId], references: [users.id] }),
  device: one(devices, { fields: [tickets.deviceId], references: [devices.id] }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  ticket: one(tickets, { fields: [comments.ticketId], references: [tickets.id] }),
  author: one(users, { fields: [comments.authorUserId], references: [users.id] }),
}));

