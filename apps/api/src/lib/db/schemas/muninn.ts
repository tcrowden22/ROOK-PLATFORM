import { pgTable, uuid, text, timestamp, boolean, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userStatusEnum = pgEnum('user_status', ['active', 'locked', 'suspended']);
export const userRoleEnum = pgEnum('user_role', ['admin', 'agent', 'user']);

// Tables - All in muninn schema
export const organizations = pgTable({ name: 'organizations', schema: 'muninn' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  domain: text('domain'),
  status: text('status').default('active').notNull(),
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  domainIdx: index('idx_organizations_domain').on(table.domain),
  statusIdx: index('idx_organizations_status').on(table.status),
  nameIdx: index('idx_organizations_name').on(table.name),
}));

export const users = pgTable({ name: 'users', schema: 'muninn' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  status: userStatusEnum('status').notNull().default('active'),
  role: userRoleEnum('role').notNull().default('user'),
  mfaEnabled: boolean('mfa_enabled').default(false),
  mfaSecret: text('mfa_secret'),
  recoveryCodes: text('recovery_codes').array(),
  tempPassword: boolean('temp_password').default(false),
  department: text('department'),
  employeeId: text('employee_id'),
  lastLogin: timestamp('last_login', { withTimezone: true }),
  syncSource: text('sync_source').default('local'),
  organizationId: uuid('organization_id').references(() => organizations.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
  statusIdx: index('idx_users_status').on(table.status),
  roleIdx: index('idx_users_role').on(table.role),
  employeeIdIdx: index('idx_users_employee_id').on(table.employeeId),
  lastLoginIdx: index('idx_users_last_login').on(table.lastLogin),
  syncSourceIdx: index('idx_users_sync_source').on(table.syncSource),
  organizationIdx: index('idx_users_organization_id').on(table.organizationId),
}));

export const groups = pgTable({ name: 'groups', schema: 'muninn' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const roles = pgTable({ name: 'roles', schema: 'muninn' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userGroups = pgTable({ name: 'user_groups', schema: 'muninn' }, {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: { columns: [table.userId, table.groupId], name: 'user_groups_pkey' },
  userIdx: index('idx_user_groups_user_id').on(table.userId),
  groupIdx: index('idx_user_groups_group_id').on(table.groupId),
}));

export const userRoles = pgTable({ name: 'user_roles', schema: 'muninn' }, {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: { columns: [table.userId, table.roleId], name: 'user_roles_pkey' },
  userIdx: index('idx_user_roles_user_id').on(table.userId),
  roleIdx: index('idx_user_roles_role_id').on(table.roleId),
}));

export const sessions = pgTable({ name: 'sessions', schema: 'muninn' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tokenIdx: index('idx_sessions_token').on(table.token),
  userIdx: index('idx_sessions_user_id').on(table.userId),
}));

export const auditLogs = pgTable({ name: 'audit_logs', schema: 'muninn' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: uuid('actor_user_id').references(() => users.id),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: uuid('target_id'),
  targetName: text('target_name'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  actorIdx: index('idx_audit_logs_actor_user_id').on(table.actorUserId),
  actionIdx: index('idx_audit_logs_action').on(table.action),
  targetTypeIdx: index('idx_audit_logs_target_type').on(table.targetType),
  createdAtIdx: index('idx_audit_logs_created_at').on(table.createdAt),
}));

export const iamPolicies = pgTable({ name: 'iam_policies', schema: 'muninn' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  type: text('type').notNull(), // password, session, access, compliance
  value: jsonb('value').default({}),
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  typeIdx: index('idx_iam_policies_type').on(table.type),
  enabledIdx: index('idx_iam_policies_enabled').on(table.enabled),
}));

export const applications = pgTable({ name: 'applications', schema: 'muninn' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  redirectUrl: text('redirect_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const ssoGrants = pgTable({ name: 'sso_grants', schema: 'muninn' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userOrganizations = pgTable({ name: 'user_organizations', schema: 'muninn' }, {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: { columns: [table.userId, table.organizationId], name: 'user_organizations_pkey' },
  userIdx: index('idx_user_organizations_user_id').on(table.userId),
  organizationIdx: index('idx_user_organizations_organization_id').on(table.organizationId),
  defaultIdx: index('idx_user_organizations_default').on(table.userId, table.isDefault),
}));

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  userOrganizations: many(userOrganizations),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  organization: one(organizations, { fields: [users.organizationId], references: [organizations.id] }),
  sessions: many(sessions),
  auditLogs: many(auditLogs),
  userGroups: many(userGroups),
  userRoles: many(userRoles),
  ssoGrants: many(ssoGrants),
  userOrganizations: many(userOrganizations),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  userGroups: many(userGroups),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
}));

export const applicationsRelations = relations(applications, ({ many }) => ({
  ssoGrants: many(ssoGrants),
}));

export const userOrganizationsRelations = relations(userOrganizations, ({ one }) => ({
  user: one(users, { fields: [userOrganizations.userId], references: [users.id] }),
  organization: one(organizations, { fields: [userOrganizations.organizationId], references: [organizations.id] }),
}));

