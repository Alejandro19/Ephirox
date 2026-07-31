import { pgTable, uuid, text, boolean, integer, date, jsonb, timestamp, numeric } from 'drizzle-orm/pg-core';

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

export const personalInfo = pgTable('personal_info', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().unique().references(() => clients.id, { onDelete: 'cascade' }),
  birthdate: date('birthdate'),
  gender: text('gender'),
  occupation: text('occupation'),
  country: text('country'),
  city: text('city'),
  phoneCode: text('phone_code').default('+52'),
  phoneNumber: text('phone_number'),
  maritalStatus: text('marital_status'),
  weight: numeric('weight', { precision: 5, scale: 1 }).$type<number>(),
  height: numeric('height', { precision: 5, scale: 1 }).$type<number>(),
  bodyFat: numeric('body_fat', { precision: 4, scale: 1 }).$type<number>(),
  onboardingReport: jsonb('onboarding_report').default({}),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const anthropometricRecords = pgTable('anthropometric_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  fecha: date('fecha').notNull().defaultNow(),
  semana: integer('semana'),
  mesNum: integer('mes_num'),
  peso: numeric('peso', { precision: 5, scale: 1 }).$type<number>(),
  cintura: numeric('cintura', { precision: 5, scale: 1 }).$type<number>(),
  brazos: numeric('brazos', { precision: 5, scale: 1 }).$type<number>(),
  hombros: numeric('hombros', { precision: 5, scale: 1 }).$type<number>(),
  piernas: numeric('piernas', { precision: 5, scale: 1 }).$type<number>(),
  gluteo: numeric('gluteo', { precision: 5, scale: 1 }).$type<number>(),
  notas: text('notas'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const progressPhotos = pgTable('progress_photos', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  anthropometricRecordId: uuid('anthropometric_record_id').references(() => anthropometricRecords.id, { onDelete: 'cascade' }),
  angle: text('angle'),
  photoUrl: text('photo_url').notNull(),
  fecha: date('fecha').notNull().defaultNow(),
  mesNum: integer('mes_num'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const bioInbodyRecords = pgTable('bio_inbody_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  fecha: date('fecha'),
  version: text('version'),
  pesoTotal: numeric('peso_total', { precision: 5, scale: 1 }).$type<number>(),
  smm: numeric('smm', { precision: 5, scale: 1 }).$type<number>(),
  grasaPct: numeric('grasa_pct', { precision: 4, scale: 1 }).$type<number>(),
  imc: numeric('imc', { precision: 4, scale: 1 }).$type<number>(),
  pesoObjetivo: numeric('peso_objetivo', { precision: 5, scale: 1 }).$type<number>(),
  grasaVisceral: numeric('grasa_visceral', { precision: 4, scale: 1 }).$type<number>(),
  bmr: numeric('bmr', { precision: 6, scale: 0 }).$type<number>(),
  anguloFase: numeric('angulo_fase', { precision: 4, scale: 2 }).$type<number>(),
  ecwTbw: numeric('ecw_tbw', { precision: 5, scale: 3 }).$type<number>(),
  masaOsea: numeric('masa_osea', { precision: 4, scale: 2 }).$type<number>(),
  altura: numeric('altura', { precision: 5, scale: 1 }).$type<number>(),
  mesNum: integer('mes_num'),
  fileUrl: text('file_url'),
  fileName: text('file_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type PersonalInfo = typeof personalInfo.$inferSelect;
export type AnthropometricRecord = typeof anthropometricRecords.$inferSelect;
export type ProgressPhoto = typeof progressPhotos.$inferSelect;
export type BioInbodyRecord = typeof bioInbodyRecords.$inferSelect;

export const exercises = pgTable('exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  dayNumber: integer('day_number').notNull().default(1),
  category: text('category').notNull().default('strength'),
  series: integer('series'),
  reps: text('reps'),
  duration: text('duration'),
  restTime: text('rest_time'),
  description: text('description'),
  recommendations: text('recommendations'),
  youtubeUrl: text('youtube_url'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const trainingCompletions = pgTable('training_completions', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  dayNumber: integer('day_number').notNull(),
  completedDate: date('completed_date').notNull().defaultNow(),
  source: text('source').notNull().default('manual'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const clientNotifications = pgTable('client_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type Exercise = typeof exercises.$inferSelect;
export type TrainingCompletion = typeof trainingCompletions.$inferSelect;
export type ClientNotification = typeof clientNotifications.$inferSelect;

export const phrases = pgTable('phrases', {
  id: uuid('id').primaryKey().defaultRandom(),
  text: text('text').notNull(),
  context: text('context').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const trainingProtectorUses = pgTable('training_protector_uses', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  weekStart: date('week_start').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const achievementLogs = pgTable('achievement_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  weekNumber: integer('week_number').notNull(),
  earnedAt: timestamp('earned_at', { withTimezone: true }).defaultNow(),
});

export const mindsetQuotes = pgTable('mindset_quotes', {
  id: uuid('id').primaryKey().defaultRandom(),
  quote: text('quote').notNull(),
  author: text('author'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type Phrase = typeof phrases.$inferSelect;
export type TrainingProtectorUse = typeof trainingProtectorUses.$inferSelect;
export type AchievementLog = typeof achievementLogs.$inferSelect;
export type MindsetQuote = typeof mindsetQuotes.$inferSelect;
