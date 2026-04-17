import { z } from "zod";

export const ItemType = z.enum(["task", "note", "doc"]);
export type ItemType = z.infer<typeof ItemType>;

export const SignUpInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});
export type SignUpInput = z.infer<typeof SignUpInput>;

export const SignInInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type SignInInput = z.infer<typeof SignInInput>;

export const CreateItemInput = z.object({
  workspaceId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  type: ItemType,
  title: z.string().min(1).max(500),
  content: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
});
export type CreateItemInput = z.infer<typeof CreateItemInput>;

export const UpdateItemInput = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
  status: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
});
export type UpdateItemInput = z.infer<typeof UpdateItemInput>;

export const ItemFilter = z.object({
  type: ItemType.optional(),
  status: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
  search: z.string().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});
export type ItemFilter = z.infer<typeof ItemFilter>;
