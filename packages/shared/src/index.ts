import { z } from "zod";

export const ItemType = z.enum(["task", "note", "doc"]);
export type ItemType = z.infer<typeof ItemType>;

export const ItemStatus = z.enum(["todo", "in_progress", "in_review", "done", "cancelled"]);
export type ItemStatus = z.infer<typeof ItemStatus>;

export const ItemPriority = z.enum(["none", "low", "medium", "high", "urgent"]);
export type ItemPriority = z.infer<typeof ItemPriority>;

export const SignUpInput = z.object({
  username: z.string().min(1).max(255),
  password: z.string().min(1),
});
export type SignUpInput = z.infer<typeof SignUpInput>;

export const SignInInput = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
export type SignInInput = z.infer<typeof SignInInput>;

export const CreateItemInput = z.object({
  workspaceId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  type: ItemType,
  title: z.string().min(1).max(500),
  content: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
  status: ItemStatus.optional(),
  priority: ItemPriority.optional(),
  dueDate: z.string().optional(),
});
export type CreateItemInput = z.infer<typeof CreateItemInput>;

export const UpdateItemInput = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
  status: ItemStatus.optional(),
  priority: ItemPriority.optional(),
  dueDate: z.string().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  position: z.number().int().optional(),
});
export type UpdateItemInput = z.infer<typeof UpdateItemInput>;

export const ItemFilter = z.object({
  type: ItemType.optional(),
  status: ItemStatus.optional(),
  priority: ItemPriority.optional(),
  parentId: z.string().uuid().nullable().optional(),
  search: z.string().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});
export type ItemFilter = z.infer<typeof ItemFilter>;

export const CreateCommentInput = z.object({
  itemId: z.string().uuid(),
  content: z.string().min(1),
});
export type CreateCommentInput = z.infer<typeof CreateCommentInput>;

export const CreateTagInput = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(100),
  color: z.string().max(7).optional(),
});
export type CreateTagInput = z.infer<typeof CreateTagInput>;
