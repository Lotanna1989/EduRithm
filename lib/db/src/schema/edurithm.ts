import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const assignmentsTable = pgTable("edurithm_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  level: varchar("level", { length: 8 }).notNull(),
  track: varchar("track", { length: 80 }).notNull(),
  prompt: text("prompt").notNull(),
});

export const submissionsTable = pgTable("edurithm_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentName: varchar("student_name", { length: 160 }).notNull(),
  studentId: varchar("student_id", { length: 80 }).notNull(),
  level: varchar("level", { length: 8 }).notNull(),
  track: varchar("track", { length: 80 }).notNull(),
  assignmentId: uuid("assignment_id")
    .notNull()
    .references(() => assignmentsTable.id),
  fileName: varchar("file_name", { length: 240 }).notNull(),
  codeContent: text("code_content").notNull(),
  score: integer("score"),
  meetsRequirements: boolean("meets_requirements"),
  issuesFound: jsonb("issues_found").$type<string[]>().notNull().default([]),
  explanation: text("explanation"),
  correctedSnippet: text("corrected_snippet"),
  flagged: boolean("flagged").notNull().default(true),
  status: varchar("status", { length: 16 }).notNull().default("queued"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatMessagesTable = pgTable("edurithm_chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => submissionsTable.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 16 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const geminiCallsTable = pgTable("edurithm_gemini_calls", {
  id: uuid("id").defaultRandom().primaryKey(),
  submissionId: uuid("submission_id").references(() => submissionsTable.id, {
    onDelete: "set null",
  }),
  kind: varchar("kind", { length: 32 }).notNull(),
  request: text("request").notNull(),
  response: text("response"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const learnConceptsTable = pgTable("edurithm_learn_concepts", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  summary: text("summary").notNull(),
  explanation: text("explanation").notNull(),
  codeExample: text("code_example").notNull(),
  youtubeUrl: text("youtube_url"),
});

export const insertAssignmentSchema = createInsertSchema(assignmentsTable).omit({
  id: true,
});
export const insertSubmissionSchema = createInsertSchema(submissionsTable).omit({
  id: true,
  createdAt: true,
});
export const insertChatMessageSchema = createInsertSchema(chatMessagesTable).omit({
  id: true,
  createdAt: true,
});
export const insertGeminiCallSchema = createInsertSchema(geminiCallsTable).omit({
  id: true,
  createdAt: true,
});
export const waitlistTable = pgTable("edurithm_waitlist", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  interests: jsonb("interests").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLearnConceptSchema = createInsertSchema(learnConceptsTable).omit({
  id: true,
});

export const insertWaitlistSchema = createInsertSchema(waitlistTable).omit({
  id: true,
  createdAt: true,
});

export type Assignment = typeof assignmentsTable.$inferSelect;
export type Submission = typeof submissionsTable.$inferSelect;
export type ChatMessage = typeof chatMessagesTable.$inferSelect;
export type LearnConcept = typeof learnConceptsTable.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type InsertGeminiCall = z.infer<typeof insertGeminiCallSchema>;
export type InsertLearnConcept = z.infer<typeof insertLearnConceptSchema>;
export type WaitlistEntry = typeof waitlistTable.$inferSelect;
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;