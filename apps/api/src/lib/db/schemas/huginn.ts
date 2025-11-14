import { pgTable, uuid, text, timestamp, boolean, numeric, pgEnum, index, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users, organizations } from './muninn';

// Enums
export const deviceStatusEnum = pgEnum('device_status', ['active', 'retired']);
export const jobStatusEnum = pgEnum('job_status', ['pending', 'running', 'success', 'failed']);
export const deviceOwnershipEnum = pgEnum('device_ownership', ['corporate', 'personal', 'shared']);

// Tables
export const devices = pgTable({ name: 'devices', schema: 'huginn' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  hostname: text('hostname').notNull(),
  os: text('os').notNull(),
  osVersion: text('os_version'),
  platform: text('platform'), // iOS, Android, Windows, macOS, Linux
  serial: text('serial'),
  ownerUserId: uuid('owner_user_id').references(() => users.id),
  ownership: deviceOwnershipEnum('ownership').default('corporate'),
  status: deviceStatusEnum('status').notNull().default('active'),
  compliance: boolean('compliance').notNull().default(true),
  tags: jsonb('tags').default('[]').notNull(), // Array of tag strings
  organizationId: uuid('organization_id').notNull().references(() => organizations.id), // Tenant isolation
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  enrolledAt: timestamp('enrolled_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  ownerIdx: index('idx_devices_owner').on(table.ownerUserId),
  complianceIdx: index('idx_devices_compliance').on(table.compliance),
  serialIdx: index('idx_devices_serial').on(table.serial),
  platformIdx: index('idx_devices_platform').on(table.platform),
  ownershipIdx: index('idx_devices_ownership').on(table.ownership),
  organizationIdx: index('idx_devices_organization').on(table.organizationId),
}));

export const telemetry = pgTable({ name: 'telemetry', schema: 'huginn' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  cpu: numeric('cpu'),
  memory: numeric('memory'),
  disk: numeric('disk'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  deviceIdx: index('idx_telemetry_device').on(table.deviceId),
  organizationIdx: index('idx_telemetry_organization_id').on(table.organizationId),
}));

export const softwarePackages = pgTable({ name: 'software_packages', schema: 'huginn' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  version: text('version').notNull(),
  platform: text('platform').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  organizationIdx: index('idx_software_packages_organization_id').on(table.organizationId),
  platformIdx: index('idx_software_packages_platform').on(table.platform),
}));

export const deploymentJobs = pgTable({ name: 'deployment_jobs', schema: 'huginn' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  packageId: uuid('package_id').notNull().references(() => softwarePackages.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  status: jobStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
}, (table) => ({
  deviceIdx: index('idx_deployment_jobs_device').on(table.deviceId),
  organizationIdx: index('idx_deployment_jobs_organization_id').on(table.organizationId),
}));

// Relations
export const devicesRelations = relations(devices, ({ one, many }) => ({
  owner: one(users, { fields: [devices.ownerUserId], references: [users.id] }),
  telemetry: many(telemetry),
  deploymentJobs: many(deploymentJobs),
}));

export const telemetryRelations = relations(telemetry, ({ one }) => ({
  device: one(devices, { fields: [telemetry.deviceId], references: [devices.id] }),
}));

export const deploymentJobsRelations = relations(deploymentJobs, ({ one }) => ({
  device: one(devices, { fields: [deploymentJobs.deviceId], references: [devices.id] }),
  package: one(softwarePackages, { fields: [deploymentJobs.packageId], references: [softwarePackages.id] }),
}));

// Device policies table
export const devicePolicies = pgTable({ name: 'device_policies', schema: 'huginn' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  platform: text('platform'), // null = all platforms
  config: jsonb('config').default('{}').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  organizationIdx: index('idx_device_policies_organization_id').on(table.organizationId),
}));

// Device policy assignments
export const devicePolicyAssignments = pgTable({ name: 'device_policy_assignments', schema: 'huginn' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  policyId: uuid('policy_id').notNull().references(() => devicePolicies.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  appliedAt: timestamp('applied_at', { withTimezone: true }),
  status: text('status').notNull().default('pending'), // pending, applied, failed
}, (table) => ({
  deviceIdx: index('idx_device_policy_assignments_device').on(table.deviceId),
  policyIdx: index('idx_device_policy_assignments_policy').on(table.policyId),
  organizationIdx: index('idx_device_policy_assignments_organization_id').on(table.organizationId),
}));

// Device activity log
export const deviceActivity = pgTable({ name: 'device_activity', schema: 'huginn' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  action: text('action').notNull(), // installApp, rotateKey, isolate, restart, wipe, etc.
  initiatedBy: uuid('initiated_by').references(() => users.id),
  status: text('status').notNull().default('queued'), // queued, processing, completed, failed
  metadata: jsonb('metadata').default('{}'),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({
  deviceIdx: index('idx_device_activity_device').on(table.deviceId),
  actionIdx: index('idx_device_activity_action').on(table.action),
  createdAtIdx: index('idx_device_activity_created_at').on(table.createdAt),
  organizationIdx: index('idx_device_activity_organization_id').on(table.organizationId),
}));

