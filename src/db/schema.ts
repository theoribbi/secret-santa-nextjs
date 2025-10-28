import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Table des événements Secret Santa
export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  date: timestamp('date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Table des personnes/utilisateurs
export const persons = pgTable('persons', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  giftIdea: text('gift_idea'),
  giftImage: varchar('gift_image', { length: 500 }), // URL de l'image
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Table d'assignation pour le tirage au sort
export const assignments = pgTable('assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  giverId: uuid('giver_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  receiverId: uuid('receiver_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Relations
export const eventsRelations = relations(events, ({ many }) => ({
  persons: many(persons),
  assignments: many(assignments),
}))

export const personsRelations = relations(persons, ({ one, many }) => ({
  event: one(events, {
    fields: [persons.eventId],
    references: [events.id],
  }),
  givenAssignments: many(assignments, { relationName: 'giver' }),
  receivedAssignments: many(assignments, { relationName: 'receiver' }),
}))

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  giver: one(persons, {
    fields: [assignments.giverId],
    references: [persons.id],
    relationName: 'giver',
  }),
  receiver: one(persons, {
    fields: [assignments.receiverId],
    references: [persons.id],
    relationName: 'receiver',
  }),
  event: one(events, {
    fields: [assignments.eventId],
    references: [events.id],
  }),
}))

// Types TypeScript
export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
export type Person = typeof persons.$inferSelect
export type NewPerson = typeof persons.$inferInsert
export type Assignment = typeof assignments.$inferSelect
export type NewAssignment = typeof assignments.$inferInsert
