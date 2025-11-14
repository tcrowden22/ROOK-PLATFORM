import { pgTable, uuid, text, timestamp, integer, numeric, date, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users, organizations } from './muninn';
import { devices } from './huginn';

// Enums
export const assetCategoryEnum = pgEnum('asset_category', ['laptop', 'desktop', 'phone', 'tablet', 'peripheral', 'software', 'license', 'other']);
export const assetStatusEnum = pgEnum('asset_status', ['requested', 'ordered', 'received', 'in_stock', 'assigned', 'in_use', 'in_repair', 'lost', 'retired', 'disposed']);
export const assetImportSourceEnum = pgEnum('asset_import_source', ['csv', 'workday', 'intune', 'jamf', 'kandji', 'sentinelone', 'manageengine']);
export const assetImportStatusEnum = pgEnum('asset_import_status', ['pending', 'processing', 'completed', 'failed']);

// Tables
export const lifecyclePolicies = pgTable({ name: 'lifecycle_policies', schema: 'skuld' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  retireAfterMonths: integer('retire_after_months').default(36),
  warrantyMonths: integer('warranty_months').default(12),
  actions: jsonb('actions').default({}),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  organizationIdx: index('idx_lifecycle_policies_organization_id').on(table.organizationId),
}));

export const assetModels = pgTable({ name: 'asset_models', schema: 'skuld' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  category: assetCategoryEnum('category').notNull(),
  manufacturer: text('manufacturer').notNull(),
  specs: jsonb('specs').default({}),
  lifecyclePolicyId: uuid('lifecycle_policy_id').references(() => lifecyclePolicies.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  categoryIdx: index('idx_asset_models_category').on(table.category),
  organizationIdx: index('idx_asset_models_organization_id').on(table.organizationId),
}));

export const vendors = pgTable({ name: 'vendors', schema: 'skuld' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull().unique(),
  externalId: text('external_id'),
  contact: jsonb('contact').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  organizationIdx: index('idx_vendors_organization_id').on(table.organizationId),
}));

export const locations = pgTable({ name: 'locations', schema: 'skuld' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  code: text('code').unique(),
  address: jsonb('address').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  organizationIdx: index('idx_locations_organization_id').on(table.organizationId),
}));

export const assets = pgTable({ name: 'assets', schema: 'skuld' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  tag: text('tag').unique(),
  serial: text('serial'),
  modelId: uuid('model_id').references(() => assetModels.id),
  status: assetStatusEnum('status').notNull().default('requested'),
  ownerUserId: uuid('owner_user_id').references(() => users.id),
  deviceId: uuid('device_id').references(() => devices.id),
  locationId: uuid('location_id').references(() => locations.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  cost: numeric('cost', { precision: 10, scale: 2 }),
  purchaseDate: date('purchase_date'),
  warrantyEnd: date('warranty_end'),
  vendorId: uuid('vendor_id').references(() => vendors.id),
  poNumber: text('po_number'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  modelIdx: index('idx_assets_model_id').on(table.modelId),
  ownerIdx: index('idx_assets_owner_user_id').on(table.ownerUserId),
  deviceIdx: index('idx_assets_device_id').on(table.deviceId),
  locationIdx: index('idx_assets_location_id').on(table.locationId),
  vendorIdx: index('idx_assets_vendor_id').on(table.vendorId),
  statusIdx: index('idx_assets_status').on(table.status),
  tagIdx: index('idx_assets_tag').on(table.tag),
  organizationIdx: index('idx_assets_organization_id').on(table.organizationId),
}));

export const assetEvents = pgTable({ name: 'asset_events', schema: 'skuld' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  type: text('type').notNull(),
  fromStatus: text('from_status'),
  toStatus: text('to_status'),
  actorUserId: uuid('actor_user_id').references(() => users.id),
  payload: jsonb('payload').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  assetIdx: index('idx_asset_events_asset_id').on(table.assetId),
  createdAtIdx: index('idx_asset_events_created_at').on(table.createdAt),
  organizationIdx: index('idx_asset_events_organization_id').on(table.organizationId),
}));

export const assetAssignments = pgTable({ name: 'asset_assignments', schema: 'skuld' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  assigneeUserId: uuid('assignee_user_id').notNull().references(() => users.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  assigneeOrgUnit: text('assignee_org_unit'),
  startDate: date('start_date').notNull().defaultNow(),
  endDate: date('end_date'),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  assetIdx: index('idx_asset_assignments_asset_id').on(table.assetId),
  assigneeIdx: index('idx_asset_assignments_assignee_user_id').on(table.assigneeUserId),
  organizationIdx: index('idx_asset_assignments_organization_id').on(table.organizationId),
}));

export const assetImports = pgTable({ name: 'asset_imports', schema: 'skuld' }, {
  id: uuid('id').primaryKey().defaultRandom(),
  source: assetImportSourceEnum('source').notNull(),
  status: assetImportStatusEnum('status').notNull().default('pending'),
  stats: jsonb('stats').default({}),
  errorText: text('error_text'),
  createdBy: uuid('created_by').references(() => users.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({
  organizationIdx: index('idx_asset_imports_organization_id').on(table.organizationId),
}));

// Relations
export const assetsRelations = relations(assets, ({ one, many }) => ({
  model: one(assetModels, { fields: [assets.modelId], references: [assetModels.id] }),
  owner: one(users, { fields: [assets.ownerUserId], references: [users.id] }),
  device: one(devices, { fields: [assets.deviceId], references: [devices.id] }),
  location: one(locations, { fields: [assets.locationId], references: [locations.id] }),
  vendor: one(vendors, { fields: [assets.vendorId], references: [vendors.id] }),
  organization: one(organizations, { fields: [assets.organizationId], references: [organizations.id] }),
  events: many(assetEvents),
  assignments: many(assetAssignments),
}));

export const assetModelsRelations = relations(assetModels, ({ one, many }) => ({
  lifecyclePolicy: one(lifecyclePolicies, { fields: [assetModels.lifecyclePolicyId], references: [lifecyclePolicies.id] }),
  assets: many(assets),
}));

