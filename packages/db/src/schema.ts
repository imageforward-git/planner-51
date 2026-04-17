import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Users ──────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  workspaceMembers: many(workspaceMembers),
  items: many(items),
  comments: many(comments),
  views: many(views),
}));

// ── Sessions ───────────────────────────────────────────────────────────────
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

// ── Workspaces ─────────────────────────────────────────────────────────────
export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  items: many(items),
  tags: many(tags),
  views: many(views),
}));

// ── Workspace Members ──────────────────────────────────────────────────────
export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    role: varchar("role", { length: 50 }).default("member").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    uniqueMember: unique().on(t.workspaceId, t.userId),
  }),
);

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
    user: one(users, {
      fields: [workspaceMembers.userId],
      references: [users.id],
    }),
  }),
);

// ── Items ──────────────────────────────────────────────────────────────────
export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id)
      .notNull(),
    parentId: uuid("parent_id"),
    type: varchar("type", { length: 50 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    content: text("content"),
    properties: jsonb("properties"),
    status: varchar("status", { length: 50 }).default("active"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    workspaceIdx: index("items_workspace_id_idx").on(t.workspaceId),
    parentIdx: index("items_parent_id_idx").on(t.parentId),
    typeIdx: index("items_type_idx").on(t.type),
  }),
);

// Self-referencing foreign key is declared via relations
export const itemsRelations = relations(items, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [items.workspaceId],
    references: [workspaces.id],
  }),
  parent: one(items, {
    fields: [items.parentId],
    references: [items.id],
    relationName: "itemParent",
  }),
  children: many(items, { relationName: "itemParent" }),
  creator: one(users, {
    fields: [items.createdBy],
    references: [users.id],
  }),
  sourceLinks: many(itemLinks, { relationName: "sourceLinks" }),
  targetLinks: many(itemLinks, { relationName: "targetLinks" }),
  itemTags: many(itemTags),
  comments: many(comments),
}));

// ── Item Links ─────────────────────────────────────────────────────────────
export const itemLinks = pgTable(
  "item_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .references(() => items.id)
      .notNull(),
    targetId: uuid("target_id")
      .references(() => items.id)
      .notNull(),
    linkType: varchar("link_type", { length: 50 }).default("reference"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    uniqueLink: unique().on(t.sourceId, t.targetId),
  }),
);

export const itemLinksRelations = relations(itemLinks, ({ one }) => ({
  source: one(items, {
    fields: [itemLinks.sourceId],
    references: [items.id],
    relationName: "sourceLinks",
  }),
  target: one(items, {
    fields: [itemLinks.targetId],
    references: [items.id],
    relationName: "targetLinks",
  }),
}));

// ── Tags ───────────────────────────────────────────────────────────────────
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id)
      .notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 7 }),
  },
  (t) => ({
    uniqueTag: unique().on(t.workspaceId, t.name),
  }),
);

export const tagsRelations = relations(tags, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [tags.workspaceId],
    references: [workspaces.id],
  }),
  itemTags: many(itemTags),
}));

// ── Item Tags ──────────────────────────────────────────────────────────────
export const itemTags = pgTable(
  "item_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .references(() => items.id)
      .notNull(),
    tagId: uuid("tag_id")
      .references(() => tags.id)
      .notNull(),
  },
  (t) => ({
    uniqueItemTag: unique().on(t.itemId, t.tagId),
  }),
);

export const itemTagsRelations = relations(itemTags, ({ one }) => ({
  item: one(items, {
    fields: [itemTags.itemId],
    references: [items.id],
  }),
  tag: one(tags, {
    fields: [itemTags.tagId],
    references: [tags.id],
  }),
}));

// ── Comments ───────────────────────────────────────────────────────────────
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id")
    .references(() => items.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const commentsRelations = relations(comments, ({ one }) => ({
  item: one(items, {
    fields: [comments.itemId],
    references: [items.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

// ── Views ──────────────────────────────────────────────────────────────────
export const views = pgTable("views", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  filter: jsonb("filter"),
  sort: jsonb("sort"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const viewsRelations = relations(views, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [views.workspaceId],
    references: [workspaces.id],
  }),
  creator: one(users, {
    fields: [views.createdBy],
    references: [users.id],
  }),
}));
