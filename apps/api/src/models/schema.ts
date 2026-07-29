import { pgTable, uuid, text, boolean, integer, date, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const admins = pgTable('admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().default('Administrador'),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  googleId: text('google_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  googleId: text('google_id'),
  status: text('status').notNull().default('active'),
  plan: text('plan').notNull().default('Miembro'),
  clientType: text('client_type').notNull().default('lead_wellness'),
  planDurationDays: integer('plan_duration_days'),
  planStartDate: date('plan_start_date'),
  planEndDate: date('plan_end_date'),
  permissions: jsonb('permissions').notNull().default({
    training: false,
    nutrition: false,
    supplementation: false,
    cortisol: false,
    community: true,
    evolution: true,
  }),
  trainingDays: integer('training_days'),
  assignedQuoteId: uuid('assigned_quote_id'),
  objetivos: jsonb('objetivos').notNull().default({}),
  inbodyCadenceType: text('inbody_cadence_type').notNull().default('mensual'),
  inbodyNextExpectedDate: date('inbody_next_expected_date'),
  inbodyReminderEnabled: boolean('inbody_reminder_enabled').notNull().default(true),
  inbodyReminderSentThisCycle: boolean('inbody_reminder_sent_this_cycle').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const adminNotifications = pgTable('admin_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  type: text('type').notNull().default('onboarding_complete'),
  message: text('message').notNull(),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type Admin = typeof admins.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
